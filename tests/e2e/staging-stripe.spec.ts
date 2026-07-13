import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  addAvailableProductToCheckout,
  getAvailableStagingProduct,
  loginWithClerk,
  requireEnvironment,
  type CheckoutRequestBody,
  type StagingRentalListResponse,
} from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

async function fillIfVisible(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
  }
}

async function waitForWebhookState(
  request: APIRequestContext,
  authorization: string,
  orderGroupId: string,
): Promise<void> {
  await expect.poll(async () => {
    const response = await request.get(`${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/my?page=1&limit=100`, {
      headers: { Authorization: authorization },
    });
    if (!response.ok()) return "request-failed";
    const payload = await response.json() as StagingRentalListResponse;
    return payload.data.find((rental) => rental.order_group_id === orderGroupId)?.status ?? "not-found";
  }, { timeout: 60_000, intervals: [2_000, 5_000] }).toMatch(/reserved|paid/);
}

test.describe("Staging - Stripe test real", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");

  test("completa Checkout test y espera el estado producido por el webhook", async ({ page, request }) => {
    await loginWithClerk(page);
    const product = await getAvailableStagingProduct(request);
    await addAvailableProductToCheckout(page, product);

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

    await page.locator('input[name="cardNumber"], input[autocomplete="cc-number"]').first().fill(
      process.env.E2E_STRIPE_TEST_CARD || "4242424242424242",
    );
    await page.locator('input[name="cardExpiry"], input[autocomplete="cc-exp"]').first().fill(
      process.env.E2E_STRIPE_TEST_EXPIRY || "1230",
    );
    await page.locator('input[name="cardCvc"], input[autocomplete="cc-csc"]').first().fill(
      process.env.E2E_STRIPE_TEST_CVC || "123",
    );
    await fillIfVisible(page, 'input[type="email"]', requireEnvironment("E2E_CLERK_EMAIL"));
    await page.getByRole("button", { name: /Pagar|Pay/ }).last().click();
    await page.waitForURL(/\/confirmation/, { timeout: 60_000 });

    expect(authorization).toMatch(/^Bearer\s+/);
    expect(checkoutBody.orderGroupId).toBeTruthy();
    await waitForWebhookState(request, authorization!, checkoutBody.orderGroupId!);
  });
});
