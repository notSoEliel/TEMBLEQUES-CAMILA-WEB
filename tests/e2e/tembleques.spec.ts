import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

interface E2EProductVariant {
  size: string;
  stock: number;
  in_maintenance: boolean;
}

interface E2EProduct {
  _id: string;
  name: string;
  variants: E2EProductVariant[];
}

interface ProductListResponse {
  data: E2EProduct[];
}

interface RentalResponse {
  rental: {
    _id: string;
    status: string;
  };
}

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

async function getAvailableProduct(request: APIRequestContext): Promise<E2EProduct> {
  const response = await request.get("http://localhost:3000/api/products?page=1&limit=20");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as ProductListResponse;
  const product = payload.data.find((candidate) =>
    candidate.variants.some((variant) => !variant.in_maintenance && variant.stock > 0),
  );

  if (!product) {
    throw new Error("El seed E2E no contiene un producto disponible.");
  }

  return product;
}

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

  test("Debe buscar y filtrar prendas en el catálogo", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    await page.goto("/catalog");

    const searchInput = page.locator('input[placeholder="Buscar productos..."]');
    await searchInput.fill(product.name.split(/\s+/)[0]);
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
  });

  test("Debe bloquear la reserva si no se aceptan los términos, y procesarla al aceptarlos", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    const size = product.variants.find((variant) => !variant.in_maintenance && variant.stock > 0)?.size;
    if (!size) throw new Error("El producto semilla no tiene talla disponible.");

    await setMockAuth(page, "mock-client-token");

    await page.goto(`/product/${product._id}`);

    await page.getByRole("button", { name: size, exact: true }).click();

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

    const termsCheckbox = page.getByTestId("checkout-terms-checkbox");
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

  test("Debe buscar productos y reservas desde la operación administrativa", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    const searchTerm = product.name.split(/\s+/)[0];

    await setMockAuth(page, "mock-admin-token");
    await page.goto(`/admin/inventory?search=${encodeURIComponent(searchTerm)}&page=1&limit=10`);
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();

    const size = product.variants.find((variant) => !variant.in_maintenance && variant.stock > 0)?.size;
    if (!size) throw new Error("El producto semilla no tiene talla disponible.");
    const orderGroupId = `phase6-search-${Date.now()}`;
    const createResponse = await request.post("http://localhost:3000/api/rentals", {
      headers: { Authorization: "Bearer mock-client-token" },
      data: {
        productId: product._id,
        selectedSize: size,
        startDate: futureDate(20),
        endDate: futureDate(22),
        termsAccepted: true,
        paymentType: "reservation",
        orderGroupId,
      },
    });
    expect(createResponse.ok()).toBeTruthy();

    await page.goto(`/admin/reservations?search=${encodeURIComponent(orderGroupId)}&page=1&limit=10`);
    await expect(page.getByText(orderGroupId.slice(-6).toUpperCase(), { exact: false })).toBeVisible();
  });

  test("Debe permitir al administrador actualizar el estado de una reserva", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    const size = product.variants.find((variant) => !variant.in_maintenance && variant.stock > 0)?.size;
    if (!size) throw new Error("El producto semilla no tiene talla disponible.");

    const createResponse = await request.post("http://localhost:3000/api/rentals", {
      headers: { Authorization: "Bearer mock-client-token" },
      data: {
        productId: product._id,
        selectedSize: size,
        startDate: futureDate(6),
        endDate: futureDate(8),
        termsAccepted: true,
        paymentType: "reservation",
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = await createResponse.json() as RentalResponse;

    const updateResponse = await request.patch(`http://localhost:3000/api/admin/rentals/${created.rental._id}/status`, {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: { status: "reserved" },
    });
    expect(updateResponse.ok()).toBeTruthy();
    const updated = await updateResponse.json() as RentalResponse;
    expect(updated.rental.status).toBe("reserved");

    await setMockAuth(page, "mock-admin-token");
    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();
    await expect(page.getByText("Reservado", { exact: true }).first()).toBeVisible();

    await page.goto(`/admin/reservations/${created.rental._id}`);
    await expect(page.getByRole("heading", { name: "Expediente de reserva", exact: true })).toBeVisible();
    await expect(page.getByText("Términos e historial", { exact: true })).toBeVisible();
    await expect(page.getByText("Stripe", { exact: false })).toBeVisible();
  });

  test("Debe permitir registrar y revisar una incidencia operativa", async ({ page }) => {
    await setMockAuth(page, "mock-admin-token");
    await page.goto("/admin/incidents");
    await expect(page.getByRole("heading", { name: "Incidencias", exact: true })).toBeVisible();
    const description = `Incidencia E2E ${Date.now()} con seguimiento administrativo.`;
    await page.getByLabel("Descripción").fill(description);
    await page.getByRole("button", { name: "Registrar incidencia" }).click();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    await page.locator('select[aria-label^="Estado de incidencia"]').last().selectOption("in_review");
    await expect(page.locator('select[aria-label^="Estado de incidencia"]').last()).toHaveValue("in_review");
  });

  test("Debe crear una notificación interna sin exponerla a otro usuario", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    const size = product.variants.find((variant) => !variant.in_maintenance && variant.stock > 0)?.size;
    if (!size) throw new Error("El producto semilla no tiene talla disponible.");

    const createRentalResponse = await request.post("http://localhost:3000/api/rentals", {
      headers: { Authorization: "Bearer mock-client-token" },
      data: {
        productId: product._id,
        selectedSize: size,
        startDate: futureDate(250),
        endDate: futureDate(252),
        termsAccepted: true,
        paymentType: "reservation",
        orderGroupId: `phase6-notifications-${Date.now()}`,
      },
    });
    expect(createRentalResponse.ok()).toBeTruthy();
    const created = await createRentalResponse.json() as RentalResponse & { rental: { _id: string } };

    const incidentResponse = await request.post("http://localhost:3000/api/admin/incidents", {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: {
        rentalId: created.rental._id,
        type: "customer_complaint",
        severity: "medium",
        description: `Notificación E2E ${Date.now()} con reserva asociada.`,
      },
    });
    expect(incidentResponse.ok()).toBeTruthy();

    await expect.poll(async () => {
      const response = await request.get("http://localhost:3000/api/notifications?page=1&limit=20", {
        headers: { Authorization: "Bearer mock-client-token" },
      });
      if (!response.ok()) return false;
      const payload = await response.json() as { data: Array<{ title: string; read_at?: string }> };
      return payload.data.some((notification) => notification.title === "Incidencia registrada");
    }, { timeout: 10_000 }).toBeTruthy();

    const forbiddenResponse = await request.get("http://localhost:3000/api/notifications?page=1&limit=20", {
      headers: { Authorization: "Bearer mock-admin-token" },
    });
    expect(forbiddenResponse.ok()).toBeTruthy();
    const adminPayload = await forbiddenResponse.json() as { data: Array<{ title: string }> };
    expect(adminPayload.data.some((notification) => notification.title === "Incidencia registrada")).toBeFalsy();

    await setMockAuth(page, "mock-client-token");
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: /Notificaciones|Notifications/ })).toBeVisible();
    await expect(page.getByText("Incidencia registrada", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /Marcar como leída|Mark as read/ }).first().click();
  });

  test("Debe proteger el bajo stock y rechazar mantenimientos solapados", async ({ page, request }) => {
    const product = await getAvailableProduct(request);
    const size = product.variants.find((variant) => !variant.in_maintenance)?.size;
    if (!size) throw new Error("El producto semilla no tiene talla para mantenimiento.");

    const lowStockResponse = await request.get("http://localhost:3000/api/admin/maintenance/low-stock?page=1&limit=20", {
      headers: { Authorization: "Bearer mock-admin-token" },
    });
    expect(lowStockResponse.ok()).toBeTruthy();
    const lowStockPayload = await lowStockResponse.json() as { threshold: number; data: unknown[] };
    expect(typeof lowStockPayload.threshold).toBe("number");
    expect(Array.isArray(lowStockPayload.data)).toBeTruthy();

    const clientLowStockResponse = await request.get("http://localhost:3000/api/admin/maintenance/low-stock", {
      headers: { Authorization: "Bearer mock-client-token" },
    });
    expect(clientLowStockResponse.status()).toBe(403);

    const startOffset = 400 + (Date.now() % 1000);
    const startDate = futureDate(startOffset);
    const endDate = futureDate(startOffset + 2);
    const maintenancePayload = { productId: product._id, selectedSize: size, startDate, endDate, reason: "Prueba de mantenimiento H71" };
    const createdResponse = await request.post("http://localhost:3000/api/admin/maintenance", {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: maintenancePayload,
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as { block: { _id: string } };

    const overlapResponse = await request.post("http://localhost:3000/api/admin/maintenance", {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: { ...maintenancePayload, reason: "Solapamiento inválido" },
    });
    expect(overlapResponse.status()).toBe(409);
    await expect(overlapResponse.json()).resolves.toMatchObject({ code: "MAINTENANCE_OVERLAP" });

    const invalidRangeResponse = await request.post("http://localhost:3000/api/admin/maintenance", {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: { ...maintenancePayload, startDate: endDate, endDate: startDate },
    });
    expect(invalidRangeResponse.status()).toBe(400);
    await expect(invalidRangeResponse.json()).resolves.toMatchObject({ code: "MAINTENANCE_DATE_RANGE_INVALID" });

    const deleteResponse = await request.delete(`http://localhost:3000/api/admin/maintenance/${created.block._id}`, {
      headers: { Authorization: "Bearer mock-admin-token" },
    });
    expect(deleteResponse.ok()).toBeTruthy();

    await setMockAuth(page, "mock-admin-token");
    await page.goto("/admin/inventory");
    await expect(page.getByText("Control de bajo stock", { exact: true })).toBeVisible();
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
    await expect(page.getByText("Cliente QA").first()).toBeVisible();
  });

  test("Debe conservar el formulario de contacto si el backend no responde", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (requestUrl.includes("/api/contact")) {
          return new Response(JSON.stringify({ error: "El servicio de contacto no está disponible.", code: "SERVICE_UNAVAILABLE" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      }) as typeof window.fetch;
    });

    await page.goto("/contacto");
    await page.getByLabel("Nombre Completo").fill("Cliente QA");
    await page.getByLabel("Correo Electrónico").fill("qa-error@example.com");
    await page.getByLabel("Tu Mensaje").fill("Necesito ayuda con una reserva existente.");
    await page.getByRole("button", { name: "Enviar Mensaje" }).click();

    await expect(page.getByRole("alert")).toContainText("servicio de contacto");
    await expect(page.getByLabel("Nombre Completo")).toHaveValue("Cliente QA");
    await expect(page.getByLabel("Correo Electrónico")).toHaveValue("qa-error@example.com");
    await expect(page.getByLabel("Tu Mensaje")).toHaveValue("Necesito ayuda con una reserva existente.");
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
    await page.getByRole("button", { name: "EN", exact: true }).first().click();

    await expect(page.getByRole("link", { name: "Catalog" }).first()).toBeVisible();
  });

  test("Debe persistir el idioma elegido para el cliente autenticado", async ({ page, request }) => {
    await request.patch("http://localhost:3000/api/auth/me", {
      headers: { Authorization: "Bearer mock-client-token" },
      data: { preferredLanguage: "es" },
    });
    await setMockAuth(page, "mock-client-token");
    await page.goto("/");

    const updatePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/me") && response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "EN", exact: true }).first().click();
    const updateResponse = await updatePromise;
    expect(updateResponse.ok()).toBeTruthy();
    const updatePayload = await updateResponse.json() as { user: { preferredLanguage?: string } };
    expect(updatePayload.user.preferredLanguage).toBe("en");

    await page.reload();
    await expect(page.getByRole("link", { name: "Catalog" }).first()).toBeVisible();
  });

  test("Debe ofrecer salto al contenido y mover el foco al cambiar de ruta", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.goto("/catalog");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("Debe mostrar un error recuperable cuando falla el catálogo", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (requestUrl.includes("/api/products")) {
          return new Response(
            JSON.stringify({ error: "El catálogo está temporalmente no disponible.", code: "SERVICE_UNAVAILABLE" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }
        return originalFetch(input, init);
      }) as typeof window.fetch;
    });

    await page.goto("/catalog");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Intentar nuevamente" })).toBeVisible();
  });

  test("Debe resolver las rutas públicas principales y conservar la navegación SPA", async ({ page }) => {
    const publicRoutes = ["/", "/catalog", "/historia", "/credencial", "/mision-vision", "/faq", "/contacto"];

    for (const route of publicRoutes) {
      await page.goto(route);
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.locator("#main-content")).toBeFocused();
    }

    await page.goto("/ruta-que-no-existe");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
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

  test("Debe validar el rango de fechas de los reportes administrativos", async ({ page, request }) => {
    await setMockAuth(page, "mock-admin-token");
    const response = await request.get("http://localhost:3000/api/admin/reports/inventory-stats?from=2026-09-10&to=2026-09-01", { headers: { Authorization: "Bearer mock-admin-token" } });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "REPORT_DATE_RANGE_INVALID" });
    await page.goto("/admin/reports?from=2026-09-10&to=2026-09-01");
    await expect(page.getByLabel("Desde")).toHaveValue("2026-09-10");
    await expect(page.getByLabel("Hasta")).toHaveValue("2026-09-01");
  });

  test("Debe rechazar promociones con un porcentaje imposible", async ({ page, request }) => {
    await setMockAuth(page, "mock-admin-token");
    const response = await request.post("http://localhost:3000/api/coupons", {
      headers: { Authorization: "Bearer mock-admin-token" },
      data: { code: `INVALID${Date.now()}`, discount_type: "percentage", value: 101 },
    });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "COUPON_PERCENTAGE_INVALID" });
    await page.goto("/admin/coupons");
    await expect(page.getByRole("heading", { name: "Gestión de Cupones" })).toBeVisible();
  });
});
