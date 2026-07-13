import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.E2E_STAGING_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // Run sequentially to avoid DB parallel conflicts in local Mongoose
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Single worker to avoid database race conditions

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  webServer: externalBaseURL
    ? undefined
    : {
        command: "bun run e2e:server",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },

  use: {
    baseURL: externalBaseURL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
