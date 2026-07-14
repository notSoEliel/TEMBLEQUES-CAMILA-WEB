import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  addAvailableProductToCheckout,
  getAvailableStagingProduct,
  loginWithClerk,
  requireEnvironment,
  fillStripeField,
  uncheckStripeField,
  type CheckoutRequestBody,
  type StagingRefundResponse,
  type StagingRentalListResponse,
  type StagingReconciliationResponse,
} from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

async function waitForWebhookState(
  page: Page,
  request: APIRequestContext,
  rentalIds: string[],
): Promise<string> {
  await expect.poll(async () => {
    const authorization = await getCurrentAuthorization(page);
    if (!authorization) return "request-failed";

    const response = await request.get(`${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/my?page=1&limit=100`, {
      headers: { Authorization: authorization },
    });
    if (!response.ok()) return "request-failed";
    const payload = await response.json() as StagingRentalListResponse;
    return payload.data.find((rental) => rentalIds.includes(rental._id))?.status ?? "not-found";
  }, { timeout: 60_000, intervals: [2_000, 5_000] }).toMatch(/reserved|paid/);

  const currentAuthorization = await getCurrentAuthorization(page);
  if (!currentAuthorization) {
    throw new Error("No se pudo renovar el token de Clerk después de confirmar el webhook.");
  }
  return currentAuthorization;
}

async function getCurrentAuthorization(page: Page): Promise<string | null> {
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

  return token ? `Bearer ${token}` : null;
}

test.describe("Staging - Stripe test real", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");
  test.setTimeout(120_000);

  test("completa Checkout test y espera el estado producido por el webhook", async ({ page, request }) => {
    await loginWithClerk(page);
    const product = await getAvailableStagingProduct(request);
    await addAvailableProductToCheckout(page, product);
    const stripeEmail = process.env.E2E_STRIPE_TEST_EMAIL || "qa.checkout@temblequescamila.com";

    let authorization: string | undefined;
    const checkoutRequestPromise = page.waitForRequest((requestEvent) => {
      if (!requestEvent.url().includes("/api/stripe/create-checkout-session")) return false;
      authorization = requestEvent.headers().authorization;
      return true;
    });

    await page.getByRole("button", { name: /Pagar/ }).click();
    const checkoutRequest = await checkoutRequestPromise;
    const checkoutBody = await checkoutRequest.postDataJSON() as CheckoutRequestBody;
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    await fillStripeField(page, 'input[name="cardNumber"], input[autocomplete="cc-number"]',
      process.env.E2E_STRIPE_TEST_CARD || "4242424242424242",
    );
    await fillStripeField(page, 'input[name="cardExpiry"], input[autocomplete="cc-exp"]',
      process.env.E2E_STRIPE_TEST_EXPIRY || "1230",
    );
    await fillStripeField(page, 'input[name="cardCvc"], input[autocomplete="cc-csc"]',
      process.env.E2E_STRIPE_TEST_CVC || "123",
    );
    await fillStripeField(page, 'input[type="email"], input[name="email"], input[autocomplete="email"], input[placeholder*="email"]', stripeEmail);
    await fillStripeField(page, 'input[autocomplete="cc-name"], input[name="billingName"], input[placeholder*="Full name"]', "QA Tembleques Camila");
    await fillStripeField(page, 'input[autocomplete="postal-code"], input[name="postalCode"], input[placeholder*="ZIP"]', "10001");
    await fillStripeField(page, 'input[type="tel"], input[autocomplete="tel"], input[name="phone"], input[placeholder*="phone"], input[placeholder*="Phone"]', "+12025550123");
    await uncheckStripeField(page, 'input[type="checkbox"]');
    await page.getByRole("button", { name: /Pagar|Pay/ }).last().click();
    await page.waitForURL(/\/confirmation/, { timeout: 60_000 });

    expect(authorization).toMatch(/^Bearer\s+/);
    expect(checkoutBody.rentalIds?.length).toBeGreaterThan(0);
    const currentAuthorization = await waitForWebhookState(page, request, checkoutBody.rentalIds!);

    const receiptResponse = await request.get(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/${checkoutBody.rentalIds![0]}/receipt.pdf`,
      { headers: { Authorization: currentAuthorization } },
    );
    if (receiptResponse.status() !== 200) {
      throw new Error(`El comprobante respondió ${receiptResponse.status()}: ${await receiptResponse.text()}`);
    }
    expect(receiptResponse.headers()["content-type"]).toContain("application/pdf");

    const reconciliationResponse = await request.post(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/payments/reconcile`,
      {
        headers: {
          Authorization: `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}`,
          "x-request-id": `staging-smoke-${Date.now()}`,
        },
      },
    );
    expect(reconciliationResponse.status()).toBe(200);
    const reconciliation = await reconciliationResponse.json() as StagingReconciliationResponse;
    expect(reconciliation.reconciliation.runId).toBeTruthy();
    expect(reconciliation.reconciliation.inspected).toBeGreaterThan(0);
    const differenceIds = new Set(
      reconciliation.reconciliation.differences.map((difference) => difference.rentalId),
    );
    for (const rentalId of checkoutBody.rentalIds!) {
      expect(differenceIds.has(rentalId)).toBe(false);
    }

    const rentalId = checkoutBody.rentalIds![0];
    const adminAuthorization = `Bearer ${requireEnvironment("E2E_MCP_BACKEND_ADMIN_TOKEN")}`;
    const fiscalQuery = "?from=2026-01-01&to=2026-12-31";
    const fiscalCsvResponse = await request.get(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/reports/financial/export-csv${fiscalQuery}`,
      { headers: { Authorization: adminAuthorization } },
    );
    expect(fiscalCsvResponse.status()).toBe(200);
    expect(fiscalCsvResponse.headers()["content-type"]).toContain("text/csv");
    expect(await fiscalCsvResponse.text()).toContain("Reporte académico y operativo");

    const fiscalPdfResponse = await request.get(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/reports/financial/export.pdf${fiscalQuery}`,
      { headers: { Authorization: adminAuthorization } },
    );
    expect(fiscalPdfResponse.status()).toBe(200);
    expect(fiscalPdfResponse.headers()["content-type"]).toContain("application/pdf");
    const pdfHeader = String.fromCharCode(...new Uint8Array(await fiscalPdfResponse.body()).slice(0, 4));
    expect(pdfHeader).toBe("%PDF");

    const unauthorizedRefundResponse = await request.post(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/rentals/${rentalId}/refund`,
      {
        headers: { Authorization: currentAuthorization, "Content-Type": "application/json" },
        data: { reason: "Intento no autorizado" },
      },
    );
    expect(unauthorizedRefundResponse.status()).toBe(403);

    const idempotencyKey = `staging-smoke-refund-${Date.now()}`;
    const refundHeaders = {
      Authorization: adminAuthorization,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-Request-Id": `staging-smoke-refund-${Date.now()}`,
    };
    const refundResponse = await request.post(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/rentals/${rentalId}/refund`,
      {
        headers: refundHeaders,
        data: { reason: "Validación académica del flujo de reembolso" },
      },
    );
    expect(refundResponse.status()).toBe(201);
    const refundPayload = await refundResponse.json() as StagingRefundResponse;
    expect(refundPayload.refund.status).toBe("succeeded");
    expect(refundPayload.refund.amount).toBeGreaterThan(0);

    const duplicateRefundResponse = await request.post(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/admin/rentals/${rentalId}/refund`,
      {
        headers: refundHeaders,
        data: { reason: "Validación académica del flujo de reembolso" },
      },
    );
    expect(duplicateRefundResponse.status()).toBe(201);
    const duplicateRefundPayload = await duplicateRefundResponse.json() as StagingRefundResponse;
    expect(duplicateRefundPayload.refund._id).toBe(refundPayload.refund._id);

    const refundedRentalsResponse = await request.get(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/my?page=1&limit=100`,
      { headers: { Authorization: currentAuthorization } },
    );
    expect(refundedRentalsResponse.status()).toBe(200);
    const refundedRentals = await refundedRentalsResponse.json() as StagingRentalListResponse;
    expect(refundedRentals.data.find((rental) => rental._id === rentalId)?.payment_status).toBe("refunded");

    const cancellationPreviewResponse = await request.get(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/${rentalId}/cancellation-preview`,
      { headers: { Authorization: currentAuthorization } },
    );
    expect(cancellationPreviewResponse.status()).toBe(200);
    const cancellationPreview = await cancellationPreviewResponse.json() as {
      cancellable: boolean;
      refundableAmount: number;
      refundPercentage: number;
    };
    expect(cancellationPreview.cancellable).toBe(true);
    expect(cancellationPreview.refundableAmount).toBeGreaterThanOrEqual(0);
    expect([0, 0.5, 1]).toContain(cancellationPreview.refundPercentage);

    const cancellationResponse = await request.delete(
      `${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/${rentalId}`,
      {
        headers: {
          Authorization: currentAuthorization,
          "Idempotency-Key": `staging-smoke-cancel-${Date.now()}`,
        },
      },
    );
    expect(cancellationResponse.status()).toBe(200);
    const cancellationPayload = await cancellationResponse.json() as {
      rental: { status: string; payment_status: string };
    };
    expect(cancellationPayload.rental.status).toBe("cancelled");
    expect(cancellationPayload.rental.payment_status).toBe("refunded");
  });
});
