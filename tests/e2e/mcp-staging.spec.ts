import { test, expect, type APIRequestContext } from "@playwright/test";
import { requireEnvironment } from "./staging-helpers";

type JsonRecord = Record<string, unknown>;

interface ProductVariant {
  size: string;
  stock: number;
  in_maintenance: boolean;
}

interface Product {
  _id: string;
  name: string;
  variants: ProductVariant[];
}

interface ProductResponse {
  data: Product[];
}

interface McpCallResponse {
  result?: {
    isError?: boolean;
    content?: Array<{ type: string; text: string }>;
    tools?: Array<{ name: string }>;
  };
  error?: { message?: string };
}

const enabled = process.env.E2E_MCP_SMOKE === "true";

function backendUrl(): string {
  return requireEnvironment("E2E_MCP_BACKEND_URL").replace(/\/$/, "");
}

function mcpUrl(): string {
  const value = requireEnvironment("E2E_MCP_REMOTE_URL").replace(/\/$/, "");
  return value.endsWith("/mcp") ? value : `${value}/mcp`;
}

function key(name: "admin" | "client"): string {
  return requireEnvironment(name === "admin" ? "MCP_ADMIN_API_KEY" : "MCP_CLIENT_API_KEY");
}

function optionalEnvironment(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function adminBackendHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}` };
}

async function mcpCall(
  request: APIRequestContext,
  token: string,
  name: string,
  argumentsValue: JsonRecord = {},
): Promise<JsonRecord> {
  const response = await request.post(mcpUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    data: {
      jsonrpc: "2.0",
      id: `${name}-${Date.now()}`,
      method: "tools/call",
      params: { name, arguments: argumentsValue },
    },
  });
  expect(response.status(), `${name} HTTP`).toBe(200);

  const payload = await readTransportPayload(response);
  if (payload.error) throw new Error(`${name}: ${payload.error.message ?? "error MCP"}`);
  const text = payload.result?.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error(`${name}: respuesta MCP sin contenido textual`);
  const data = JSON.parse(text) as JsonRecord;
  if (payload.result?.isError) throw new Error(`${name}: la tool devolvió un error`);
  expect(typeof data.requestId, `${name} requestId`).toBe("string");
  return data;
}

async function readTransportPayload(response: { headers(): Record<string, string>; text(): Promise<string> }): Promise<McpCallResponse> {
  const body = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  if (contentType.includes("text/event-stream")) {
    const events = body.split("\n").filter((line) => line.startsWith("data:"));
    const lastEvent = events.at(-1)?.slice("data:".length).trim();
    if (!lastEvent) throw new Error("El transporte MCP no devolvió un evento data.");
    return JSON.parse(lastEvent) as McpCallResponse;
  }
  return JSON.parse(body) as McpCallResponse;
}

async function listTools(request: APIRequestContext, token?: string): Promise<string[]> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request.post(mcpUrl(), {
    headers,
    data: { jsonrpc: "2.0", id: `list-${Date.now()}`, method: "tools/list", params: {} },
  });
  expect(response.status()).toBe(200);
  const payload = await readTransportPayload(response);
  return payload.result?.tools?.map((tool) => tool.name) ?? [];
}

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

test.describe("MCP remoto de staging", () => {
  test.skip(!enabled, "Se ejecuta solo con E2E_MCP_SMOKE=true.");
  test.setTimeout(180_000);

  test("guest, servicios CI, scopes y 18 tools con limpieza", async ({ request }) => {
    const adminKey = key("admin");
    const clientKey = key("client");

    const guestTools = await listTools(request);
    expect(guestTools).toEqual(["catalog_products_search", "catalog_availability_check"]);

    const unauthorized = await request.post(mcpUrl(), {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      data: {
        jsonrpc: "2.0",
        id: "guest-protected",
        method: "tools/call",
        params: { name: "admin_dashboard_summary", arguments: {} },
      },
    });
    expect(unauthorized.status()).toBe(401);
    expect(unauthorized.headers()["www-authenticate"]).toContain("oauth-protected-resource");

    const adminTools = await listTools(request, adminKey);
    expect(adminTools).toHaveLength(18);
    const clientTools = await listTools(request, clientKey);
    expect(clientTools).toHaveLength(6);
    expect(clientTools).not.toContain("admin_dashboard_summary");

    const productResponse = await request.get(`${backendUrl()}/api/products?page=1&limit=50`);
    expect(productResponse.ok()).toBeTruthy();
    const products = await productResponse.json() as ProductResponse;
    const product = products.data.find((candidate) =>
      candidate.variants.some((variant) => !variant.in_maintenance && variant.stock > 0),
    );
    if (!product) throw new Error("No hay producto semilla disponible para MCP.");
    const variant = product.variants.find((candidate) => !candidate.in_maintenance && candidate.stock > 0);
    if (!variant) throw new Error("No hay variante disponible para MCP.");

    const startDate = futureDate(21);
    const endDate = futureDate(22);
    const createdProductIds: string[] = [];
    let draftRentalId: string | undefined;
    let statusRentalId: string | undefined;

    try {
      await mcpCall(request, clientKey, "catalog_products_search", { search: product.name, page: 1, limit: 10 });
      await mcpCall(request, clientKey, "catalog_availability_check", {
        productId: product._id,
        from: startDate,
        to: endDate,
      });
      await mcpCall(request, adminKey, "admin_dashboard_summary");
      await mcpCall(request, adminKey, "admin_rentals_list", { search: product.name, page: 1, limit: 10 });
      await mcpCall(request, adminKey, "admin_calendar_range", { from: startDate, to: endDate });
      const users = await mcpCall(request, adminKey, "admin_users_search", { search: "", page: 1, limit: 10 });
      await mcpCall(request, adminKey, "reports_operations_generate", { format: "summary" });
      await mcpCall(request, adminKey, "security_audit_search", { page: 1, limit: 10 });
      await mcpCall(request, adminKey, "ops_health_check");
      await mcpCall(request, adminKey, "payments_reconcile_run");

      const userData = isRecord(users.data) ? users.data : {};
      const firstUser = Array.isArray(userData.data) && isRecord(userData.data[0]) ? userData.data[0] : undefined;
      const userId = typeof firstUser?._id === "string" ? firstUser._id : undefined;
      if (userId) {
        const detail = await mcpCall(request, adminKey, "admin_users_detail", { userId, page: 1, limit: 10 });
        expect(JSON.stringify(detail)).not.toContain("user_agent");
        expect(JSON.stringify(detail)).not.toContain("ip_address");
      }

      const draft = await mcpCall(request, clientKey, "rentals_draft_create", {
        productId: product._id,
        selectedSize: variant.size,
        startDate,
        endDate,
        termsAccepted: true,
        paymentType: "reservation",
      });
      const draftData = isRecord(draft.data) ? draft.data : {};
      const draftRental = isRecord(draftData.rental) ? draftData.rental : undefined;
      draftRentalId = typeof draftRental?._id === "string" ? draftRental._id : undefined;
      expect(draftRentalId).toBeTruthy();

      await mcpCall(request, clientKey, "rentals_mine_list", { view: "active", page: 1, limit: 10 });
      await mcpCall(request, clientKey, "payments_checkout_create", { rentalId: draftRentalId, paymentType: "reservation" });
      await mcpCall(request, clientKey, "rentals_pending_cancel", { rentalId: draftRentalId });

      const secondDraft = await mcpCall(request, clientKey, "rentals_draft_create", {
        productId: product._id,
        selectedSize: variant.size,
        startDate: futureDate(24),
        endDate: futureDate(25),
        termsAccepted: true,
        paymentType: "reservation",
      });
      const secondData = isRecord(secondDraft.data) ? secondDraft.data : {};
      const secondRental = isRecord(secondData.rental) ? secondData.rental : undefined;
      statusRentalId = typeof secondRental?._id === "string" ? secondRental._id : undefined;
      expect(statusRentalId).toBeTruthy();
      await mcpCall(request, adminKey, "admin_rentals_status_update", { rentalId: statusRentalId, status: "reserved" });
      await mcpCall(request, adminKey, "admin_rentals_status_update", { rentalId: statusRentalId, status: "cancelled" });

      const temporaryProductPayload = {
        name: `Smoke MCP ${Date.now()}`,
        description: "Producto temporal para validación MCP.",
        category: ["accesorios"],
        rental_price: 1,
        variants: [{ size: "Única", stock: 1, in_maintenance: false }],
        images: [],
      };
      const created = await mcpCall(request, adminKey, "admin_products_upsert", { product: temporaryProductPayload });
      const createdData = isRecord(created.data) ? created.data : {};
      const createdProduct = isRecord(createdData.product) ? createdData.product : undefined;
      const createdProductId = typeof createdProduct?._id === "string" ? createdProduct._id : undefined;
      expect(createdProductId).toBeTruthy();
      if (createdProductId) {
        createdProductIds.push(createdProductId);
        await mcpCall(request, adminKey, "admin_inventory_variant_maintenance_set", {
          productId: createdProductId,
          selectedSize: "Única",
          inMaintenance: true,
          reason: "Smoke MCP de mantenimiento.",
        });
        await mcpCall(request, adminKey, "admin_inventory_variant_maintenance_set", {
          productId: createdProductId,
          selectedSize: "Única",
          inMaintenance: false,
          reason: "Restauración del smoke MCP.",
        });
      }

      await mcpCall(request, adminKey, "reports_operations_generate", {
        format: "json",
        productId: product._id,
        from: startDate,
        to: endDate,
      });
      await mcpCall(request, adminKey, "reports_operations_generate", { format: "csv", category: "accesorios" });
    } finally {
      for (const productId of createdProductIds) {
        await request.delete(`${backendUrl()}/api/admin/products/${productId}`, { headers: adminBackendHeaders() });
      }
      if (statusRentalId) {
        await request.patch(`${backendUrl()}/api/admin/rentals/${statusRentalId}/status`, {
          headers: { ...adminBackendHeaders(), "Content-Type": "application/json" },
          data: { status: "cancelled" },
        });
      }
    }
  });

  test("OAuth de cliente valida el ciclo de reserva sin pago", async ({ request }) => {
    const oauthToken = optionalEnvironment("E2E_MCP_OAUTH_TOKEN");
    test.skip(!oauthToken, "Requiere E2E_MCP_OAUTH_TOKEN temporal y seguro.");
    if (!oauthToken) return;

    const productResponse = await request.get(`${backendUrl()}/api/products?page=1&limit=50`);
    expect(productResponse.ok()).toBeTruthy();
    const products = await productResponse.json() as ProductResponse;
    const product = products.data.find((candidate) =>
      candidate.variants.some((variant) => !variant.in_maintenance && variant.stock > 0),
    );
    if (!product) throw new Error("No hay producto semilla disponible para el smoke OAuth de MCP.");
    const variant = product.variants.find((candidate) => !candidate.in_maintenance && candidate.stock > 0);
    if (!variant) throw new Error("No hay variante disponible para el smoke OAuth de MCP.");

    const clientTools = await listTools(request, oauthToken);
    expect(clientTools).toEqual(expect.arrayContaining([
      "catalog_products_search",
      "catalog_availability_check",
      "rentals_draft_create",
      "payments_checkout_create",
      "rentals_mine_list",
      "rentals_pending_cancel",
    ]));
    expect(clientTools).not.toContain("admin_dashboard_summary");

    const startDate = futureDate(30);
    const endDate = futureDate(31);
    let draftRentalId: string | undefined;
    let cancelled = false;

    try {
      await mcpCall(request, oauthToken, "catalog_products_search", {
        search: product.name,
        page: 1,
        limit: 10,
      });
      await mcpCall(request, oauthToken, "catalog_availability_check", {
        productId: product._id,
        from: startDate,
        to: endDate,
      });

      const draft = await mcpCall(request, oauthToken, "rentals_draft_create", {
        productId: product._id,
        selectedSize: variant.size,
        startDate,
        endDate,
        termsAccepted: true,
        paymentType: "reservation",
      });
      const draftData = isRecord(draft.data) ? draft.data : {};
      const rental = isRecord(draftData.rental) ? draftData.rental : undefined;
      draftRentalId = typeof rental?._id === "string" ? rental._id : undefined;
      expect(draftRentalId).toBeTruthy();
      expect(rental?.status).toBe("pending");
      if (!draftRentalId) throw new Error("La reserva OAuth no devolvió un identificador.");

      const ownReservations = await mcpCall(request, oauthToken, "rentals_mine_list", {
        view: "active",
        page: 1,
        limit: 10,
      });
      const ownData = isRecord(ownReservations.data) ? ownReservations.data : {};
      const ownRows = Array.isArray(ownData.data) ? ownData.data : [];
      expect(ownRows.some((row) => isRecord(row) && row._id === draftRentalId)).toBeTruthy();

      const checkout = await mcpCall(request, oauthToken, "payments_checkout_create", {
        rentalId: draftRentalId,
        paymentType: "reservation",
      });
      const checkoutData = isRecord(checkout.data) ? checkout.data : {};
      expect(typeof checkoutData.url).toBe("string");
      expect(typeof checkoutData.sessionId).toBe("string");

      const cancelledRental = await mcpCall(request, oauthToken, "rentals_pending_cancel", {
        rentalId: draftRentalId,
      });
      const cancelledData = isRecord(cancelledRental.data) ? cancelledRental.data : {};
      const cancelledRecord = isRecord(cancelledData.rental) ? cancelledData.rental : cancelledData;
      expect(cancelledRecord.status).toBe("cancelled");
      cancelled = true;

      const remaining = await mcpCall(request, oauthToken, "rentals_mine_list", {
        view: "active",
        page: 1,
        limit: 10,
      });
      const remainingData = isRecord(remaining.data) ? remaining.data : {};
      const remainingRows = Array.isArray(remainingData.data) ? remainingData.data : [];
      expect(remainingRows.some((row) => isRecord(row) && row._id === draftRentalId)).toBeFalsy();
    } finally {
      if (draftRentalId && !cancelled) {
        await mcpCall(request, oauthToken, "rentals_pending_cancel", { rentalId: draftRentalId });
      }
    }
  });

  test("OAuth remoto filtra tools por rol real", async ({ request }) => {
    const oauthToken = optionalEnvironment("E2E_MCP_OAUTH_TOKEN");
    test.skip(!oauthToken, "Requiere E2E_MCP_OAUTH_TOKEN configurado en staging.");
    const tools = await listTools(request, oauthToken);
    expect(tools).toContain("catalog_products_search");
    expect(tools).toContain("catalog_availability_check");
    expect(tools).not.toContain("payments_reconcile_run");
  });
});
