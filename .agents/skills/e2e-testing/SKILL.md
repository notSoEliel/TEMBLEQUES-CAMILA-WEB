---
name: e2e-testing
description: Create and execute End-to-End tests using Playwright. Use this skill when asked to write tests, configure the CI testing pipeline, or validate core user flows.
license: Complete terms in LICENSE.txt
---

# Playwright E2E Testing Strategy

This skill enforces the testing requirements for the platform.

## 1. Mandatory Test Flows

When writing E2E tests, ensure you cover these specific scenarios outlined in the PRD:
- User registration and login (using Clerk mocks or specific test credentials).
- Catalog search and filtering.
- The complete reservation process.
- **Negative Testing**: Attempting to proceed to checkout WITHOUT accepting the Terms & Conditions (must assert that the UI blocks this).
- Admin panel reservation management.

## 2. Configuration Rules

- Set up Playwright to run against the local Docker environment or a dedicated test environment.
- Configure `playwright.config.ts` to output HTML reports and trace files for debugging.

## 3. Best Practices

- Use `data-testid` attributes on critical UI elements (like the terms checkbox or the checkout button) to make tests resilient to design changes.
- Mock external services like Stripe for standard flow testing to avoid hitting rate limits or requiring real credit cards during CI.

## 4. CI Integration

Prepare the scripts so tests can be run easily via a single command (e.g., `bun run test:e2e`) in the GitHub Actions pipeline.
