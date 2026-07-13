import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

export interface StagingProductVariant {
  size: string;
  stock: number;
  in_maintenance: boolean;
}

export interface StagingProduct {
  _id: string;
  name: string;
  variants: StagingProductVariant[];
}

export interface StagingProductResponse {
  data: StagingProduct[];
}

export interface CheckoutRequestBody {
  orderGroupId?: string;
  paymentType?: "reservation" | "full";
}

export interface StagingRental {
  _id: string;
  order_group_id?: string;
  status: string;
}

export interface StagingRentalListResponse {
  data: StagingRental[];
}

export function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable ${name} para el smoke test real de staging.`);
  }
  return value;
}

function getStagingBackendURL(): string {
  return requireEnvironment("E2E_BACKEND_URL").replace(/\/$/, "");
}

export async function loginWithClerk(page: Page): Promise<void> {
  const email = requireEnvironment("E2E_CLERK_EMAIL");

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await expect(page).not.toHaveURL(/\/login/);
}

export async function getAvailableStagingProduct(request: APIRequestContext): Promise<StagingProduct> {
  const response = await request.get(`${getStagingBackendURL()}/api/products?page=1&limit=50`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as StagingProductResponse;
  const product = payload.data.find((candidate) =>
    candidate.variants.some((variant) => !variant.in_maintenance && variant.stock > 0),
  );

  if (!product) {
    throw new Error("Staging no tiene productos disponibles para el smoke test.");
  }

  return product;
}

export function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export async function addAvailableProductToCheckout(
  page: Page,
  product: StagingProduct,
): Promise<void> {
  const variant = product.variants.find((candidate) =>
    !candidate.in_maintenance && candidate.stock > 0,
  );
  if (!variant) {
    throw new Error("El producto seleccionado no tiene una variante disponible.");
  }

  await page.goto(`/product/${product._id}`);
  await page.getByRole("button", { name: variant.size, exact: true }).click();

  const dayButtons = page.locator("div.grid-cols-7 button:not([disabled])");
  await expect(dayButtons.first()).toBeVisible();
  await dayButtons.nth(0).click();
  await dayButtons.nth(1).click();

  await page.getByRole("button", { name: "Añadir al Carrito" }).click();
  await page.getByRole("button", { name: "Ir al Carrito", exact: true }).click();
  await page.getByRole("button", { name: "Reservar Ahora" }).click();
  await expect(page).toHaveURL(/checkout\/multi/);
  await page.getByRole("button", { name: "Continuar a Términos" }).click();
  await page.getByTestId("checkout-terms-checkbox").click();
  await page.getByRole("button", { name: "Continuar a Revisión" }).click();
}
