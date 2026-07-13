import { test, expect } from "@playwright/test";
import { loginWithClerk } from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

test.describe("Staging - Clerk real", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");

  test("rechaza API protegida y autentica una cuenta test en staging", async ({ page, request }) => {
    const unauthenticatedResponse = await request.get("/api/rentals/my?page=1&limit=1");
    expect(unauthenticatedResponse.status()).toBe(401);

    await loginWithClerk(page);
    await page.goto("/profile");

    await expect(page.locator("#profile-email")).toHaveValue(process.env.E2E_CLERK_EMAIL ?? "");
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
