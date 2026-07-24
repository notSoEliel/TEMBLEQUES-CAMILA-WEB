import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  futureDate,
  getAvailableStagingProduct,
  loginWithClerk,
  requireEnvironment,
  type StagingProduct,
} from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

interface AuthMeResponse {
  user: {
    id: string;
  };
}

interface NotificationItem {
  _id: string;
  title: string;
  read_at?: string;
  metadata?: Record<string, string>;
}

interface NotificationListResponse {
  data: NotificationItem[];
}

interface IncidentResponse {
  incident: {
    _id: string;
  };
}

interface MaintenanceResponse {
  block: {
    _id: string;
  };
}

interface LowStockResponse {
  threshold: number;
  data: unknown[];
}

function backendURL(): string {
  return requireEnvironment("E2E_BACKEND_URL").replace(/\/$/, "");
}

function adminHeaders(): { Authorization: string } {
  return { Authorization: `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}` };
}

async function getCurrentAuthorization(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerk = (window as Window & {
      Clerk?: {
        session?: {
          getToken: () => Promise<string | null>;
        };
      };
    }).Clerk;
    const tokenPromise = clerk?.session?.getToken();
    if (!tokenPromise) return null;
    return Promise.race([
      tokenPromise,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000)),
    ]);
  });

  if (!token) throw new Error("No se pudo obtener el token vigente de Clerk para staging.");
  return `Bearer ${token}`;
}

async function getCurrentUserId(page: Page, request: APIRequestContext, authorization: string): Promise<string> {
  const response = await request.get(`${backendURL()}/api/auth/me`, { headers: { Authorization: authorization } });
  expect(response.status()).toBe(200);
  const payload = await response.json() as AuthMeResponse;
  expect(payload.user.id).toBeTruthy();
  return payload.user.id;
}

async function chooseMaintenanceProduct(request: APIRequestContext): Promise<{ product: StagingProduct; size: string }> {
  const product = await getAvailableStagingProduct(request);
  const variant = product.variants.find((candidate) => !candidate.in_maintenance);
  if (!variant) throw new Error("El seed remoto no tiene una variante apta para mantenimiento.");
  return { product, size: variant.size };
}

test.describe("Staging - evidencia operativa de fase 6", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");
  test.setTimeout(90_000);

  test("H70: notificación interna aislada y lectura autenticada", async ({ page, request }) => {
    await loginWithClerk(page);
    const authorization = await getCurrentAuthorization(page);
    const userId = await getCurrentUserId(page, request, authorization);
    const description = `Smoke remoto H70 ${Date.now()}: incidencia de prueba.`;

    const incidentResponse = await request.post(`${backendURL()}/api/admin/incidents`, {
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      data: {
        userId,
        type: "customer_complaint",
        severity: "low",
        description,
      },
    });
    expect(incidentResponse.status()).toBe(201);
    const incident = await incidentResponse.json() as IncidentResponse;

    try {
      await expect.poll(async () => {
        const response = await request.get(`${backendURL()}/api/notifications?page=1&limit=50`, {
          headers: { Authorization: authorization },
        });
        if (response.status() !== 200) return false;
        const payload = await response.json() as NotificationListResponse;
        return payload.data.find((notification) =>
          notification.title === "Incidencia registrada"
          && notification.metadata?.incidentId === incident.incident._id,
        ) ?? false;
      }, { timeout: 15_000, intervals: [500, 1_000, 2_000] }).toBeTruthy();

      const notificationResponse = await request.get(`${backendURL()}/api/notifications?page=1&limit=50`, {
        headers: { Authorization: authorization },
      });
      expect(notificationResponse.status()).toBe(200);
      const notificationPayload = await notificationResponse.json() as NotificationListResponse;
      const notification = notificationPayload.data.find((item) =>
        item.title === "Incidencia registrada" && item.metadata?.incidentId === incident.incident._id,
      );
      expect(notification?._id).toBeTruthy();

      const markReadResponse = await request.patch(`${backendURL()}/api/notifications/${notification?._id}/read`, {
        headers: { Authorization: authorization },
      });
      expect(markReadResponse.status()).toBe(200);

      const adminNotificationResponse = await request.get(`${backendURL()}/api/notifications?page=1&limit=50`, {
        headers: adminHeaders(),
      });
      expect(adminNotificationResponse.status()).toBe(200);
      const adminNotifications = await adminNotificationResponse.json() as NotificationListResponse;
      expect(adminNotifications.data.some((item) => item.title === "Incidencia registrada" && !item.read_at)).toBeFalsy();
    } finally {
      await request.patch(`${backendURL()}/api/admin/incidents/${incident.incident._id}`, {
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        data: { status: "closed", note: "Limpieza del smoke remoto." },
      });
    }
  });

  test("H71: bajo stock, permisos y solapamiento de mantenimientos", async ({ page, request }) => {
    await loginWithClerk(page);
    const authorization = await getCurrentAuthorization(page);
    const lowStockResponse = await request.get(`${backendURL()}/api/admin/maintenance/low-stock?page=1&limit=20`, {
      headers: adminHeaders(),
    });
    expect(lowStockResponse.status()).toBe(200);
    const lowStockPayload = await lowStockResponse.json() as LowStockResponse;
    expect(Number.isInteger(lowStockPayload.threshold)).toBeTruthy();
    expect(Array.isArray(lowStockPayload.data)).toBeTruthy();

    const clientLowStockResponse = await request.get(`${backendURL()}/api/admin/maintenance/low-stock?page=1&limit=20`, {
      headers: { Authorization: authorization },
    });
    expect(clientLowStockResponse.status()).toBe(403);

    const thresholdResponse = await request.patch(`${backendURL()}/api/admin/maintenance/threshold`, {
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      data: { threshold: lowStockPayload.threshold },
    });
    expect(thresholdResponse.status()).toBe(200);

    const { product, size } = await chooseMaintenanceProduct(request);
    const startDate = futureDate(400 + (Date.now() % 100));
    const endDate = futureDate(402 + (Date.now() % 100));
    const maintenancePayload = {
      productId: product._id,
      selectedSize: size,
      startDate,
      endDate,
      reason: "Smoke remoto H71",
    };
    let maintenanceId: string | undefined;

    try {
      const createResponse = await request.post(`${backendURL()}/api/admin/maintenance`, {
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        data: maintenancePayload,
      });
      expect(createResponse.status()).toBe(201);
      const created = await createResponse.json() as MaintenanceResponse;
      maintenanceId = created.block._id;

      const overlapResponse = await request.post(`${backendURL()}/api/admin/maintenance`, {
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        data: maintenancePayload,
      });
      expect(overlapResponse.status()).toBe(409);
      await expect(overlapResponse.json()).resolves.toMatchObject({ code: "MAINTENANCE_OVERLAP" });

      const invalidRangeResponse = await request.post(`${backendURL()}/api/admin/maintenance`, {
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        data: { ...maintenancePayload, startDate: endDate, endDate: startDate },
      });
      expect(invalidRangeResponse.status()).toBe(400);
      await expect(invalidRangeResponse.json()).resolves.toMatchObject({ code: "MAINTENANCE_DATE_RANGE_INVALID" });
    } finally {
      if (maintenanceId) {
        const deleteResponse = await request.delete(`${backendURL()}/api/admin/maintenance/${maintenanceId}`, {
          headers: adminHeaders(),
        });
        expect(deleteResponse.status()).toBe(200);
      }
    }
  });
});
