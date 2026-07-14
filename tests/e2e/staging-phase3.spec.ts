import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { loginWithClerk, requireEnvironment } from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

interface ObservabilityOverview {
  health: {
    database: { status: string };
    dependencies: Record<string, string>;
    configuration: { appEnv: string; backups: string };
    cron: { job: string; lastRunAt?: string; lastSuccessAt?: string; lastError?: string };
  };
  metrics: {
    counters: Array<{ name: string; value: number; labels: Record<string, string> }>;
    latency: { requestCount: number; averageMs: number; p95Ms: number };
    recentErrors: Array<{ code: string; statusCode: number; path?: string }>;
  };
  alerts: Array<{ _id: string; status: string; severity: string; type: string }>;
}

interface PrivacyExport {
  profile: { name: string; email: string };
  rentals: unknown[];
  termsAcceptances: Array<{ ip_address: string; user_agent: string }>;
}

function backendURL(): string {
  return requireEnvironment("E2E_BACKEND_URL").replace(/\/$/, "");
}

function adminHeaders(): { Authorization: string } {
  return { Authorization: `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}` };
}

async function currentAuthorization(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerk = (window as Window & {
      Clerk?: { session?: { getToken: () => Promise<string | null> } };
    }).Clerk;
    const tokenPromise = clerk?.session?.getToken();
    if (!tokenPromise) return null;
    return Promise.race([
      tokenPromise,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000)),
    ]);
  });
  if (!token) throw new Error("No se pudo obtener el token vigente de Clerk.");
  return `Bearer ${token}`;
}

async function fetchJson<T>(request: APIRequestContext, path: string, headers: Record<string, string>): Promise<T> {
  const response = await request.get(`${backendURL()}${path}`, { headers });
  expect(response.status()).toBe(200);
  return await response.json() as T;
}

test.describe("Staging - evidencia operativa de fase 3", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");
  test.setTimeout(90_000);

  test("H48-H50: observabilidad protegida, métricas y alertas", async ({ request }) => {
    const base = backendURL();
    const unauthorized = await request.get(`${base}/api/admin/observability/metrics`);
    expect(unauthorized.status()).toBe(401);

    const metrics = await fetchJson<{ metrics: ObservabilityOverview["metrics"] }>(
      request,
      "/api/admin/observability/metrics",
      adminHeaders(),
    );
    expect(metrics.metrics.counters.length).toBeGreaterThan(0);

    const overview = await fetchJson<{ health: ObservabilityOverview["health"]; metrics: ObservabilityOverview["metrics"]; alerts: ObservabilityOverview["alerts"] }>(
      request,
      "/api/admin/observability/overview",
      adminHeaders(),
    );
    expect(overview.health.database.status).toBe("ok");
    expect(overview.health.configuration.appEnv).toBe("staging");
    expect(overview.health.cron.lastSuccessAt).toBeTruthy();
    expect(overview.metrics.latency.requestCount).toBeGreaterThan(0);
    expect(Array.isArray(overview.alerts)).toBeTruthy();

  });

  test("H51: dashboard técnico visible para una cuenta administrativa", async ({ page }) => {
    await loginWithClerk(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByText("Salud técnica", { exact: true })).toBeVisible();
    await expect(page.getByText("Base de datos", { exact: true })).toBeVisible();
    await expect(page.getByText("Latencia p95", { exact: true })).toBeVisible();
    await expect(page.getByText("Alertas abiertas", { exact: true })).toBeVisible();
    await expect(page.getByText("Última ejecución automática", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/staging-phase3-dashboard.png", fullPage: true });
  });

  test("H59: exportación y anonimización verificadas con cuenta QA", async ({ page, request }) => {
    await loginWithClerk(page);
    const authorization = await currentAuthorization(page);
    const headers = { Authorization: authorization };

    const before = await fetchJson<PrivacyExport>(request, "/api/privacy/export", headers);
    expect(Array.isArray(before.rentals)).toBeTruthy();
    expect(Array.isArray(before.termsAcceptances)).toBeTruthy();

    const alreadyAnonymized = /^deleted-[a-f0-9]{24}@privacy\.invalid$/.test(before.profile.email);
    if (alreadyAnonymized) {
      expect(before.profile.name).toBe("Usuario anonimizado");
      for (const acceptance of before.termsAcceptances) {
        expect(acceptance.ip_address).toBe("anonimizada");
        expect(acceptance.user_agent).toBe("anonimizado");
      }
      return;
    }

    expect(before.profile.email).toBe(requireEnvironment("E2E_CLERK_EMAIL"));

    const anonymizeResponse = await request.delete(`${backendURL()}/api/privacy`, { headers });
    expect(anonymizeResponse.status()).toBe(200);

    const after = await fetchJson<PrivacyExport>(request, "/api/privacy/export", headers);
    expect(after.profile.name).toBe("Usuario anonimizado");
    expect(after.profile.email).toMatch(/^deleted-[a-f0-9]{24}@privacy\.invalid$/);
    for (const acceptance of after.termsAcceptances) {
      expect(acceptance.ip_address).toBe("anonimizada");
      expect(acceptance.user_agent).toBe("anonimizado");
    }
  });
});
