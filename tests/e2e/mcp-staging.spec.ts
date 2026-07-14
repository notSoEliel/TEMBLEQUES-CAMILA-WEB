import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginWithClerk, requireEnvironment } from "./staging-helpers";

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

interface AuthMeResponse {
  user: { id: string };
}

interface McpCallResponse {
  result?: {
    isError?: boolean;
    content?: Array<{ type: string; text: string }>;
    tools?: unknown[];
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

function adminBackendHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}` };
}

async function currentClerkToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerk = (window as Window & {
      Clerk?: { session?: { getToken: () => Promise<string | null> } };
    }).Clerk;
    return clerk?.session?.getToken() ?? null;
  });
  if (!token) throw new Error("No se pudo obtener el token Clerk para el smoke MCP.");
  return token;
}

async function mcpCall(
  request: APIRequestContext,
  token: string,
  name: string,
  argumentsValue: JsonRecord = {},
  clerkToken?: string,
): Promise<JsonRecord> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (clerkToken) headers["X-MCP-Clerk-Token"] = clerkToken;

  const response = await request.post(mcpUrl(), {
    headers,
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

  test("valida autenticación y las 18 tools con limpieza", async ({ page, request }) => {
    const adminKey = key("admin");
    const clientKey = key("client");
    const clerkTokenPromise = loginWithClerk(page).then(() => currentClerkToken(page));

    const unauthorized = await request.post(mcpUrl(), {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    });
    expect(unauthorized.status()).toBe(401);

    const toolsList = await request.post(mcpUrl(), {
      headers: {
        Authorization: `Bearer ${adminKey}`,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    });
    expect(toolsList.status()).toBe(200);
    const toolsPayload = await readTransportPayload(toolsList);
    const listedTools = toolsPayload.result?.tools;
    expect(Array.isArray(listedTools)).toBeTruthy();
    expect(listedTools).toHaveLength(18);

    const clerkToken = await clerkTokenPromise;
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
      await mcpCall(request, clientKey, "catalog.products.search", {
        search: product.name,
        page: 1,
        limit: 10,
      });
      await mcpCall(request, clientKey, "catalog.availability.check", {
        productId: product._id,
        from: startDate,
        to: endDate,
      });
      await mcpCall(request, adminKey, "admin.dashboard.summary");
      await mcpCall(request, adminKey, "admin.rentals.list", { search: product.name, page: 1, limit: 10 });
      await mcpCall(request, adminKey, "admin.calendar.range", { from: startDate, to: endDate });
      await mcpCall(request, adminKey, "admin.users.search", { search: "", page: 1, limit: 10 });
      await mcpCall(request, adminKey, "reports.operations.generate", { format: "summary" });
      await mcpCall(request, adminKey, "security.audit.search", { page: 1, limit: 10 });
      await mcpCall(request, adminKey, "ops.health.check");
      await mcpCall(request, adminKey, "payments.reconcile.run");

      const authMe = await request.get(`${backendUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      expect(authMe.status()).toBe(200);
      const authPayload = await authMe.json() as AuthMeResponse;

      const missingIdentity = await request.post(mcpUrl(), {
        headers: {
          Authorization: `Bearer ${clientKey}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        data: {
          jsonrpc: "2.0",
          id: "missing-clerk",
          method: "tools/call",
          params: { name: "rentals.mine.list", arguments: {} },
        },
      });
      expect(missingIdentity.status()).toBe(200);
      const missingPayload = await readTransportPayload(missingIdentity);
      expect(missingPayload.error || missingPayload.result?.isError).toBeTruthy();

      const draft = await mcpCall(request, clientKey, "rentals.draft.create", {
        productId: product._id,
        selectedSize: variant.size,
        startDate,
        endDate,
        termsAccepted: true,
        paymentType: "reservation",
      }, clerkToken);
      const draftData = isRecord(draft.data) ? draft.data : {};
      const draftRental = isRecord(draftData.rental) ? draftData.rental : undefined;
      draftRentalId = typeof draftRental?._id === "string" ? draftRental._id : undefined;
      expect(draftRentalId).toBeTruthy();

      await mcpCall(request, clientKey, "rentals.mine.list", { view: "active", page: 1, limit: 10 }, clerkToken);
      await mcpCall(request, clientKey, "payments.checkout.create", { rentalId: draftRentalId, paymentType: "reservation" }, clerkToken);
      await mcpCall(request, clientKey, "rentals.pending.cancel", { rentalId: draftRentalId }, clerkToken);

      const secondDraft = await mcpCall(request, clientKey, "rentals.draft.create", {
        productId: product._id,
        selectedSize: variant.size,
        startDate: futureDate(24),
        endDate: futureDate(25),
        termsAccepted: true,
        paymentType: "reservation",
      }, clerkToken);
      const secondData = isRecord(secondDraft.data) ? secondDraft.data : {};
      const secondRental = isRecord(secondData.rental) ? secondData.rental : undefined;
      statusRentalId = typeof secondRental?._id === "string" ? secondRental._id : undefined;
      expect(statusRentalId).toBeTruthy();
      await mcpCall(request, adminKey, "admin.rentals.status.update", { rentalId: statusRentalId, status: "reserved" });
      await mcpCall(request, adminKey, "admin.rentals.status.update", { rentalId: statusRentalId, status: "cancelled" });

      const detail = await mcpCall(request, adminKey, "admin.users.detail", {
        userId: authPayload.user.id,
        page: 1,
        limit: 10,
      });
      expect(JSON.stringify(detail)).not.toContain("user_agent");
      expect(JSON.stringify(detail)).not.toContain("ip_address");

      const temporaryProductPayload = {
        name: `Smoke MCP ${Date.now()}`,
        description: "Producto temporal para validación MCP.",
        category: ["accesorios"],
        rental_price: 1,
        variants: [{ size: "Única", stock: 1, in_maintenance: false }],
        images: [],
      };
      const created = await mcpCall(request, adminKey, "admin.products.upsert", { product: temporaryProductPayload });
      const createdData = isRecord(created.data) ? created.data : {};
      const createdProduct = isRecord(createdData.product) ? createdData.product : undefined;
      const createdProductId = typeof createdProduct?._id === "string" ? createdProduct._id : undefined;
      expect(createdProductId).toBeTruthy();
      if (createdProductId) {
        createdProductIds.push(createdProductId);
        await mcpCall(request, adminKey, "admin.inventory.variantMaintenance.set", {
          productId: createdProductId,
          selectedSize: "Única",
          inMaintenance: true,
          reason: "Smoke MCP de mantenimiento.",
        });
        await mcpCall(request, adminKey, "admin.inventory.variantMaintenance.set", {
          productId: createdProductId,
          selectedSize: "Única",
          inMaintenance: false,
          reason: "Restauración del smoke MCP.",
        });
      }

      await mcpCall(request, adminKey, "reports.operations.generate", {
        format: "json",
        productId: product._id,
        from: startDate,
        to: endDate,
      });
      await mcpCall(request, adminKey, "reports.operations.generate", { format: "csv", category: "accesorios" });
    } finally {
      for (const productId of createdProductIds) {
        await request.delete(`${backendUrl()}/api/admin/products/${productId}`, {
          headers: adminBackendHeaders(),
        });
      }
      if (statusRentalId) {
        await request.patch(`${backendUrl()}/api/admin/rentals/${statusRentalId}/status`, {
          headers: { ...adminBackendHeaders(), "Content-Type": "application/json" },
          data: { status: "cancelled" },
        });
      }
    }
  });
});
