import { test, expect } from "@playwright/test";
import { loginWithClerk, requireEnvironment } from "./staging-helpers";

const stagingURL = process.env.E2E_STAGING_URL ?? "http://localhost:5173";
const realIntegrationsEnabled = process.env.E2E_REAL_INTEGRATIONS === "true";

test.use({ baseURL: stagingURL });

test.describe("Staging - Clerk real", () => {
  test.skip(!realIntegrationsEnabled, "Se ejecuta solo con E2E_REAL_INTEGRATIONS=true.");

  test("rechaza API protegida y autentica una cuenta test en staging", async ({ page, request }) => {
    const backendURL = requireEnvironment("E2E_BACKEND_URL");
    const unauthenticatedResponse = await request.get(`${backendURL}/api/rentals/my?page=1&limit=1`);
    expect(unauthenticatedResponse.status()).toBe(401);

    await loginWithClerk(page);
    await page.goto("/profile");

    const profileEmail = await page.locator("#profile-email").inputValue();
    const expectedEmail = process.env.E2E_CLERK_EMAIL ?? "";
    const isAnonymizedEmail = /^deleted-[a-f0-9]{24}@privacy\.invalid$/.test(profileEmail);
    expect(profileEmail === expectedEmail || isAnonymizedEmail).toBeTruthy();
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
