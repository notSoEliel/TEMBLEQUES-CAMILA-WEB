import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  addAvailableProductToCheckout,
  getAvailableStagingProduct,
  loginWithClerk,
  requireEnvironment,
  fillStripeField,
  uncheckStripeField,
  type CheckoutRequestBody,
  type StagingRentalListResponse,
} from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

async function waitForWebhookState(
  request: APIRequestContext,
  authorization: string,
  rentalIds: string[],
): Promise<void> {
  await expect.poll(async () => {
    const response = await request.get(`${requireEnvironment("E2E_BACKEND_URL")}/api/rentals/my?page=1&limit=100`, {
      headers: { Authorization: authorization },
    });
    if (!response.ok()) return "request-failed";
    const payload = await response.json() as StagingRentalListResponse;
    return payload.data.find((rental) => rentalIds.includes(rental._id))?.status ?? "not-found";
  }, { timeout: 60_000, intervals: [2_000, 5_000] }).toMatch(/reserved|paid/);
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
    await waitForWebhookState(request, authorization!, checkoutBody.rentalIds!);
  });
});
