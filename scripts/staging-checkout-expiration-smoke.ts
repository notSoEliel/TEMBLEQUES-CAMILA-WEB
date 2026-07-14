import { createHmac } from "node:crypto";

const backendUrl = "https://backend-production-e696.up.railway.app";
const adminToken = process.env.MCP_BACKEND_ADMIN_TOKEN;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!adminToken || !stripeSecret || !webhookSecret) {
  throw new Error("Faltan credenciales de ejecución en el entorno seguro de Railway.");
}

interface ProductVariant {
  size: string;
  stock: number;
  in_maintenance: boolean;
}

interface Product {
  _id: string;
  variants: ProductVariant[];
}

interface ProductResponse {
  data: Product[];
}

interface AvailabilityRange {
  start: string;
  end: string;
  size: string;
}

interface AvailabilityResponse {
  booked: AvailabilityRange[];
}

interface RentalResponse {
  rental: { _id: string };
}

interface CheckoutResponse {
  sessionId: string;
}

interface RentalStateResponse {
  rental: { status: string; payment_status: string };
}

interface StripeSessionResponse {
  id: string;
  metadata?: Record<string, string>;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function rangeIsAvailable(
  start: Date,
  end: Date,
  booked: AvailabilityRange[],
  size: string,
  stock: number,
): boolean {
  for (let current = new Date(start); current <= end; current = addDays(current, 1)) {
    const day = isoDate(current);
    const occupied = booked.filter((range) => {
      const rangeStart = range.start.slice(0, 10);
      const rangeEnd = range.end.slice(0, 10);
      return (range.size === size || range.size === "Único") && day >= rangeStart && day <= rangeEnd;
    }).length;
    if (occupied >= stock) return false;
  }
  return true;
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`Solicitud de staging falló con ${response.status}: ${body}`);
  return JSON.parse(body) as T;
}

async function getFixtureSelection(): Promise<{ productId: string; size: string; startDate: string; endDate: string }> {
  const products = await readJson<ProductResponse>(`${backendUrl}/api/products?page=1&limit=50`);
  for (const product of products.data) {
    const variant = product.variants.find((candidate) => candidate.stock > 0 && !candidate.in_maintenance);
    if (!variant) continue;

    const fromDate = addDays(new Date(), 3);
    const toDate = addDays(fromDate, 180);
    const from = isoDate(fromDate);
    const to = isoDate(toDate);
    const availability = await readJson<AvailabilityResponse>(
      `${backendUrl}/api/products/${product._id}/availability?from=${from}&to=${to}`,
    );
    for (let start = new Date(`${from}T12:00:00.000Z`); start < toDate; start = addDays(start, 1)) {
      const end = addDays(start, 1);
      if (start.getUTCMonth() !== end.getUTCMonth() || start.getUTCFullYear() !== end.getUTCFullYear()) continue;
      if (rangeIsAvailable(start, end, availability.booked ?? [], variant.size, variant.stock)) {
        return { productId: product._id, size: variant.size, startDate: isoDate(start), endDate: isoDate(end) };
      }
    }
  }
  throw new Error("No hay un rango libre para la prueba de expiración.");
}

function adminHeaders(): HeadersInit {
  return { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };
}

async function getRentalState(rentalId: string): Promise<RentalStateResponse> {
  return readJson<RentalStateResponse>(`${backendUrl}/api/rentals/${rentalId}`, {
    headers: adminHeaders(),
  });
}

async function waitForExpired(rentalId: string, timeoutMs: number): Promise<RentalStateResponse> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await getRentalState(rentalId);
    if (state.rental.status === "cancelled" && state.rental.payment_status === "expired") return state;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  return getRentalState(rentalId);
}

async function sendSignedExpirationEvent(sessionId: string): Promise<number> {
  const session = await readJson<StripeSessionResponse>(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Basic ${Buffer.from(`${stripeSecret}:`).toString("base64")}` } },
  );
  const payload = {
    id: `evt_phase4_expiration_${Date.now()}`,
    object: "event",
    api_version: "2025-03-31.basil",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        metadata: session.metadata ?? {},
        status: "expired",
        payment_status: "unpaid",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    type: "checkout.session.expired",
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret as string)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const response = await fetch(`${backendUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${signature}`,
      "X-Request-Id": `phase4-expiration-${Date.now()}`,
    },
    body: rawBody,
  });
  if (!response.ok) throw new Error(`El webhook firmado respondió ${response.status}: ${await response.text()}`);
  return response.status;
}

async function main(): Promise<void> {
  const selection = await getFixtureSelection();
  const createRental = await readJson<RentalResponse>(`${backendUrl}/api/rentals`, {
  method: "POST",
  headers: adminHeaders(),
  body: JSON.stringify({
    productId: selection.productId,
    selectedSize: selection.size,
    startDate: selection.startDate,
    endDate: selection.endDate,
    termsAccepted: true,
    paymentType: "reservation",
  }),
  });
  const rentalId = createRental.rental._id;
  const checkout = await readJson<CheckoutResponse>(`${backendUrl}/api/stripe/create-checkout-session`, {
  method: "POST",
  headers: adminHeaders(),
  body: JSON.stringify({ rentalIds: [rentalId] }),
  });

  const expireResponse = await fetch(
  `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkout.sessionId)}/expire`,
  {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${stripeSecret}:`).toString("base64")}` },
  },
  );
  if (!expireResponse.ok) throw new Error(`Stripe no pudo expirar la sesión: ${await expireResponse.text()}`);

  let state = await waitForExpired(rentalId, 45_000);
  let signedFallbackStatus: number | undefined;
  if (state.rental.payment_status !== "expired") {
    signedFallbackStatus = await sendSignedExpirationEvent(checkout.sessionId);
    state = await waitForExpired(rentalId, 15_000);
  }

  if (state.rental.status !== "cancelled" || state.rental.payment_status !== "expired") {
    throw new Error("La reserva no terminó en cancelled/expired después de expirar el Checkout.");
  }

  console.log(JSON.stringify({
    checkoutExpired: expireResponse.status,
    signedFallbackStatus,
    rentalStatus: state.rental.status,
    paymentStatus: state.rental.payment_status,
    fixture: "temporary-staging-expiration",
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error desconocido en la prueba de expiración.");
  process.exitCode = 1;
});
