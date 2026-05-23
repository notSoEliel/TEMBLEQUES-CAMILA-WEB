import { test, expect } from "@playwright/test";

test.describe("Tembleques Camila - E2E Tests", () => {
  // Test 1: Authentication Bypass (Client & Admin)
  test("Debe poder autenticarse y verificar roles usando tokens simulados", async ({ page }) => {
    // 1. Cliente
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mock_auth_token", "mock-client-token");
    });
    await page.goto("/profile");
    
    // Verificar que el usuario cargó correctamente
    await expect(page.locator("h1").last()).toContainText("comienza aquí, Test");
    await expect(page.locator('input[disabled]')).toHaveValue("client@test.com");

    // 2. Administrador
    await page.evaluate(() => {
      localStorage.setItem("mock_auth_token", "mock-admin-token");
    });
    await page.goto("/admin");
    
    // Verificar que cargó el panel del administrador
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    
    // Limpiar auth
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  // Test 2: Catalog Search & Filter
  test("Debe buscar y filtrar prendas en el catálogo", async ({ page }) => {
    await page.goto("/catalog");
    
    // Buscar un producto específico
    const searchInput = page.locator('input[placeholder="Buscar productos..."]');
    await searchInput.fill("Congo");
    await page.getByRole("button", { name: "Buscar" }).click();
    
    // Verificar resultados
    await expect(page.getByRole("heading", { name: "Vestuario congo", exact: false })).toBeVisible();
  });

  // Test 3: Checkout and Terms & Conditions (Negative & Positive cases)
  test("Debe bloquear la reserva si no se aceptan los términos, y procesarla al aceptarlos", async ({ page }) => {
    // Loguear como cliente
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mock_auth_token", "mock-client-token");
    });
    
    // Ir al detalle del producto
    await page.goto("/catalog");
    await page.getByRole("heading", { name: "Vestuario congo", exact: false }).first().click();
    
    // Seleccionar talla
    await page.getByRole("button", { name: "S", exact: true }).click();
    
    // Seleccionar las primeras dos fechas disponibles
    const dayButtons = page.locator("div.grid-cols-7 button:not([disabled])");
    await expect(dayButtons.first()).toBeVisible();
    await dayButtons.nth(0).click();
    await dayButtons.nth(1).click();
    
    // Añadir al carrito
    await page.getByRole("button", { name: "Añadir al Carrito" }).click();
    
    // Confirmar e ir al carrito
    await page.getByRole("button", { name: "Ir al Carrito", exact: true }).click();
    await expect(page).toHaveURL(/.*cart/);
    
    // Hacer clic en reservar
    await page.getByRole("button", { name: "Reservar Ahora" }).click();
    await expect(page).toHaveURL(/.*checkout\/multi/);
    
    // Paso 1: Productos -> Hacer clic en continuar
    await page.getByRole("button", { name: "Continuar a Términos" }).click();
    
    // Paso 2: Términos -> Botón "Continuar a Revisión" debe estar DESHABILITADO inicialmente (Caso Negativo)
    const continueToPaymentBtn = page.getByRole("button", { name: "Continuar a Revisión" });
    await expect(continueToPaymentBtn).toBeDisabled();
    
    // Hacer clic en el checkbox de términos
    const termsCheckbox = page.locator('button[role="checkbox"]#terms, input#terms');
    await termsCheckbox.click();
    
    // El botón debe habilitarse ahora (Caso Positivo)
    await expect(continueToPaymentBtn).toBeEnabled();
    
    // Hacer clic en continuar
    await continueToPaymentBtn.click();
    
    // Paso 3: Revisión y Pago -> Elegir Solo Reserva y hacer clic en pagar
    await page.getByRole("button", { name: "Pagar", exact: false }).click();
    
    // Esperar redirección al éxito (simulación en modo demo local)
    await expect(page).toHaveURL(/.*confirmation/, { timeout: 20000 });
    await expect(page.getByText("¡Reserva Confirmada!")).toBeVisible();
  });

  // Test 4: Admin Panel access and features
  test("Debe permitir al administrador gestionar el panel de control", async ({ page }) => {
    // Loguear como admin
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mock_auth_token", "mock-admin-token");
    });
    
    // Navegar al dashboard
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    
    // Navegar a Inventario
    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible();
    
    // Navegar a Reservas
    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();
    
    // Limpiar
    await page.evaluate(() => {
      localStorage.clear();
    });
  });
});
