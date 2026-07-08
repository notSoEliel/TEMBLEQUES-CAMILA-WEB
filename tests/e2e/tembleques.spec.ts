import { test, expect, type Page } from "@playwright/test";

async function setMockAuth(page: Page, token: "mock-client-token" | "mock-admin-token"): Promise<void> {
  await page.evaluate((mockToken) => {
    localStorage.setItem("mock_auth_token", mockToken);
  }, token);
  await page.reload();
}

test.describe("Tembleques Camila - E2E Tests", () => {
  test.setTimeout(120_000);

  test.beforeAll(async ({ request }) => {
    await expect
      .poll(
        async () => {
          const response = await request.get("http://localhost:3000/api/products?page=1&limit=1", {
            timeout: 5_000,
          }).catch(() => null);
          if (!response?.ok()) return 0;
          const payload = await response.json();
          return payload?.data?.length ?? 0;
        },
        { timeout: 90_000, message: "El backend debe estar listo y con datos semilla." },
      )
      .toBeGreaterThan(0);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("Debe poder autenticarse y verificar roles usando tokens simulados", async ({ page }) => {
    await setMockAuth(page, "mock-client-token");
    await page.goto("/profile");

    await expect(page.locator("h1").last()).toContainText("comienza aquí, Test");
    await expect(page.locator('input[disabled]')).toHaveValue("client@test.com");

    await setMockAuth(page, "mock-admin-token");
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("Debe buscar y filtrar prendas en el catálogo", async ({ page }) => {
    await page.goto("/catalog");

    const searchInput = page.locator('input[placeholder="Buscar productos..."]');
    await searchInput.fill("Pollera");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByRole("heading", { name: "Pollera Santeñena Clásica", exact: false })).toBeVisible();
  });

  test("Debe bloquear la reserva si no se aceptan los términos, y procesarla al aceptarlos", async ({ page }) => {
    await setMockAuth(page, "mock-client-token");

    await page.goto("/catalog");
    await page.getByRole("heading", { name: "Pollera Santeñena Clásica", exact: false }).first().click();

    await page.getByRole("button", { name: "S", exact: true }).click();

    const dayButtons = page.locator("div.grid-cols-7 button:not([disabled])");
    await expect(dayButtons.first()).toBeVisible();
    await dayButtons.nth(0).click();
    await dayButtons.nth(1).click();

    await page.getByRole("button", { name: "Añadir al Carrito" }).click();

    await page.getByRole("button", { name: "Ir al Carrito", exact: true }).click();
    await expect(page).toHaveURL(/.*cart/);

    await page.getByRole("button", { name: "Reservar Ahora" }).click();
    await expect(page).toHaveURL(/.*checkout\/multi/);

    await page.getByRole("button", { name: "Continuar a Términos" }).click();

    const continueToPaymentBtn = page.getByRole("button", { name: "Continuar a Revisión" });
    await expect(continueToPaymentBtn).toBeDisabled();

    const termsCheckbox = page.locator('button[role="checkbox"]#terms, input#terms');
    await termsCheckbox.click();

    await expect(continueToPaymentBtn).toBeEnabled();
    await continueToPaymentBtn.click();

    await page.getByRole("button", { name: "Pagar", exact: false }).click();

    await expect(page).toHaveURL(/.*confirmation/, { timeout: 20000 });
    await expect(page.getByText("¡Reserva Confirmada!")).toBeVisible();
  });

  test("Debe permitir al administrador gestionar el panel de control", async ({ page }) => {
    await setMockAuth(page, "mock-admin-token");

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible();

    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
  });

  test("Debe enviar mensajes de contacto y mostrarlos en administración", async ({ page }) => {
    await page.goto("/contacto");

    await page.getByLabel("Nombre Completo").fill("Cliente QA");
    await page.getByLabel("Correo Electrónico").fill("qa-contacto@example.com");
    await page.getByLabel("Tu Mensaje").fill("Necesito confirmar disponibilidad para una presentación folklórica.");
    await page.getByRole("button", { name: "Enviar Mensaje" }).click();

    await expect(page.getByText("Mensaje recibido correctamente", { exact: false })).toBeVisible();

    await setMockAuth(page, "mock-admin-token");
    await page.goto("/admin/contacts");

    await expect(page.getByRole("heading", { name: "Mensajes de Contacto" })).toBeVisible();
    await expect(page.getByText("Cliente QA")).toBeVisible();
  });

  test("Debe guardar perfil persistente del cliente", async ({ page, request }) => {
    await setMockAuth(page, "mock-client-token");
    await page.goto("/profile");

    await expect(page.locator('input[disabled]')).toHaveValue("client@test.com");
    await page.getByLabel("Contacto de Enlace").fill("+507 6000-0000");
    await page.getByLabel("Dirección Preferida").fill("Casco Viejo, Panama");
    await expect(page.getByLabel("Contacto de Enlace")).toHaveValue("+507 6000-0000");
    await expect(page.getByLabel("Dirección Preferida")).toHaveValue("Casco Viejo, Panama");
    const saveResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/me") && response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Guardar Perfil" }).click();
    const saveResponse = await saveResponsePromise;
    const savePayload = await saveResponse.json();

    await expect(page.getByText("Perfil actualizado", { exact: false })).toBeVisible();
    expect(savePayload.user.phone).toBe("+507 6000-0000");
    expect(savePayload.user.preferredAddress).toBe("Casco Viejo, Panama");

    const response = await request.get("http://localhost:3000/api/auth/me", {
      headers: { Authorization: "Bearer mock-client-token" },
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.user.phone).toBe("+507 6000-0000");
    expect(payload.user.preferredAddress).toBe("Casco Viejo, Panama");
  });

  test("Debe cambiar idioma en la navegación pública", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Catálogo" }).first()).toBeVisible();
    await page.locator('div[aria-label="Idioma"] button', { hasText: "EN" }).first().click();

    await expect(page.getByRole("link", { name: "Catalog" }).first()).toBeVisible();
  });

  test("Debe exponer módulos administrativos de cupones, reportes y reglas", async ({ page }) => {
    await setMockAuth(page, "mock-admin-token");

    await page.goto("/admin/coupons");
    await expect(page.getByRole("heading", { name: "Gestión de Cupones" })).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Rotación y Desempeño Comercial" })).toBeVisible();

    await page.goto("/admin/business-rules");
    await expect(page.getByRole("heading", { name: "Información y Reglas" })).toBeVisible();
  });
});
