import { expect, type APIRequestContext, type Frame, type Page } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

export interface StagingProductVariant {
  size: string;
  stock: number;
  in_maintenance: boolean;
}

export interface StagingProduct {
  _id: string;
  name: string;
  variants: StagingProductVariant[];
}

export interface StagingProductResponse {
  data: StagingProduct[];
}

interface StagingBookedRange {
  start: string;
  end: string;
  size: string;
}

interface StagingAvailabilityResponse {
  booked: StagingBookedRange[];
}

export interface CheckoutRequestBody {
  rentalIds?: string[];
  orderGroupId?: string;
  paymentType?: "reservation" | "full";
}

export interface StagingRental {
  _id: string;
  order_group_id?: string;
  status: string;
  payment_status?: string;
}

export interface StagingRentalListResponse {
  data: StagingRental[];
}

export interface StagingReconciliationDifference {
  rentalId: string;
  code: string;
}

export interface StagingReconciliationResponse {
  reconciliation: {
    runId: string;
    inspected: number;
    consistent: number;
    inconsistent: number;
    differences: StagingReconciliationDifference[];
  };
}

export interface StagingRefundResponse {
  refund: {
    _id: string;
    status: "pending" | "succeeded" | "failed";
    amount: number;
  };
  refundedTotal: number;
  refundableRemaining: number;
}

export function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable ${name} para el smoke test real de staging.`);
  }
  return value;
}

function getStagingBackendURL(): string {
  return requireEnvironment("E2E_BACKEND_URL").replace(/\/$/, "");
}

let clerkSetupPromise: Promise<unknown> | undefined;

async function ensureClerkSetup(): Promise<void> {
  clerkSetupPromise ??= clerkSetup();
  await clerkSetupPromise;
}

export async function loginWithClerk(page: Page): Promise<void> {
  const email = requireEnvironment("E2E_CLERK_EMAIL");

  await ensureClerkSetup();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(page).not.toHaveURL(/\/login/);
}

export async function getAvailableStagingProduct(request: APIRequestContext): Promise<StagingProduct> {
  const response = await request.get(`${getStagingBackendURL()}/api/products?page=1&limit=50`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as StagingProductResponse;
  const product = payload.data.find((candidate) =>
    candidate.variants.some((variant) => !variant.in_maintenance && variant.stock > 0),
  );

  if (!product) {
    throw new Error("Staging no tiene productos disponibles para el smoke test.");
  }

  return product;
}

export function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
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
  booked: StagingBookedRange[],
  size: string,
  stock: number,
): boolean {
  for (let current = new Date(start); current <= end; current = addDays(current, 1)) {
    const day = isoDate(current);
    const bookedUnits = booked.filter((range) => {
      const rangeStart = range.start.slice(0, 10);
      const rangeEnd = range.end.slice(0, 10);
      return (range.size === size || range.size === "Único") && day >= rangeStart && day <= rangeEnd;
    }).length;
    if (bookedUnits >= stock) return false;
  }
  return true;
}

async function findAvailableDateRange(
  request: APIRequestContext,
  productId: string,
  size: string,
  stock: number,
): Promise<{ start: string; end: string }> {
  const from = futureDate(3);
  const to = futureDate(180);
  const response = await request.get(
    `${getStagingBackendURL()}/api/products/${productId}/availability?from=${from}&to=${to}`,
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as StagingAvailabilityResponse;
  const firstDay = new Date(`${from}T12:00:00.000Z`);
  const lastStart = new Date(`${to}T12:00:00.000Z`);

  for (let start = new Date(firstDay); start < lastStart; start = addDays(start, 1)) {
    const end = addDays(start, 1);
    if (rangeIsAvailable(start, end, payload.booked ?? [], size, stock)) {
      return { start: isoDate(start), end: isoDate(end) };
    }
  }

  throw new Error("Staging no tiene un rango consecutivo disponible para el smoke test.");
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function addAvailableProductToCheckout(
  page: Page,
  request: APIRequestContext,
  product: StagingProduct,
): Promise<void> {
  const variant = product.variants.find((candidate) =>
    !candidate.in_maintenance && candidate.stock > 0,
  );
  if (!variant) {
    throw new Error("El producto seleccionado no tiene una variante disponible.");
  }

  const selectedRange = await findAvailableDateRange(request, product._id, variant.size, variant.stock);

  await page.goto(`/product/${product._id}`);
  await page.getByRole("button", { name: variant.size, exact: true }).click();

  const availabilityLoading = page.getByTestId("availability-loading");
  if (await availabilityLoading.count()) {
    await expect(availabilityLoading).toBeHidden({ timeout: 15_000 });
  }

  const now = new Date();
  const target = new Date(`${selectedRange.start}T12:00:00.000Z`);
  const monthDelta = (target.getUTCFullYear() - now.getUTCFullYear()) * 12
    + target.getUTCMonth() - now.getUTCMonth();
  for (let month = 0; month < monthDelta; month += 1) {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  await expect(page.getByText(`${MONTH_NAMES_ES[target.getUTCMonth()]} ${target.getUTCFullYear()}`, { exact: true }))
    .toBeVisible();

  const startButton = page.getByRole("button", { name: new RegExp(`^${selectedRange.start}(?: |$)`) });
  const endButton = page.getByRole("button", { name: new RegExp(`^${selectedRange.end}(?: |$)`) });
  await expect(startButton).toBeEnabled({ timeout: 15_000 });
  await startButton.click();
  await expect(endButton).toBeEnabled({ timeout: 15_000 });
  await endButton.click();

  await page.getByRole("button", { name: "Añadir al Carrito" }).click();
  await page.getByRole("button", { name: "Ir al Carrito", exact: true }).click();
  await page.getByRole("button", { name: "Reservar Ahora" }).click();
  await expect(page).toHaveURL(/checkout\/multi/);
  await page.getByRole("button", { name: "Continuar a Términos" }).click();
  await page.getByTestId("checkout-terms-checkbox").click();
  await page.getByRole("button", { name: "Continuar a Revisión" }).click();
}

export async function fillStripeField(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  let visibleField: ReturnType<Page["locator"]> | undefined;

  await expect.poll(async () => {
    const contexts: Array<Page | Frame> = [page, ...page.frames()];
    for (const context of contexts) {
      const field = context.locator(selector).first();
      if (await field.isVisible().catch(() => false)) {
        visibleField = field;
        return true;
      }
    }

    return false;
  }, { timeout: 30_000, intervals: [250, 500, 1_000] }).toBeTruthy();

  if (visibleField) {
    await visibleField.fill(value);
    return;
  }

  throw new Error(`No se encontró el campo de Stripe: ${selector}`);
}

export async function uncheckStripeField(
  page: Page,
  selector: string,
): Promise<void> {
  let checkedField: ReturnType<Page["locator"]> | undefined;

  await expect.poll(async () => {
    const contexts: Array<Page | Frame> = [page, ...page.frames()];
    for (const context of contexts) {
      const field = context.locator(selector).first();
      if (await field.isVisible().catch(() => false) && await field.isChecked().catch(() => false)) {
        checkedField = field;
        return true;
      }
    }

    return false;
  }, { timeout: 30_000, intervals: [250, 500, 1_000] }).toBeTruthy();

  if (checkedField) {
    await checkedField.uncheck();
  }
}
