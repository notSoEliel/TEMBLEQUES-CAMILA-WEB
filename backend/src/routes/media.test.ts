import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { AppError } from "../lib/errors";

// 1. Mocks
vi.mock("cloudinary", () => {
  return {
    v2: {
      config: vi.fn(),
      utils: {
        api_sign_request: vi.fn(() => "mocked-signature-1234"),
      },
    },
  };
});

vi.mock("../middleware/auth.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    const token = c.req.header("Authorization");
    if (!token) {
      throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");
    }
    
    if (token === "Bearer mock-client") {
      c.set("user", { role: "client", name: "Client" });
    } else if (token === "Bearer mock-admin") {
      c.set("user", { role: "admin", name: "Admin" });
    }
    await next();
  },
  requireAdmin: async (c: any, next: any) => {
    const user = c.get("user");
    if (user.role !== "admin") {
      throw new AppError("Acceso denegado. Se requiere rol de administrador.", 403, "AUTH_FORBIDDEN");
    }
    await next();
  },
}));

// 2. Imports after mocks
import mediaRouter from "./media";

// Mocking Cloudinary Fetch
const mockCloudinaryFetch = async (formData: FormData) => {
  const allowedFormats = formData.get("allowed_formats");
  const maxImageSize = formData.get("max_image_file_size");
  const signature = formData.get("signature");
  
  // Simulación de Cloudinary rechazando por firma inválida (parámetros modificados)
  if (signature !== "mocked-signature-1234") {
    return { ok: false, json: async () => ({ error: { message: "Invalid signature" } }) };
  }
  
  // Simulación de rechazo por formato (frontend ignoró la regla y envió pdf, o algo no soportado)
  const format = formData.get("format") || "jpg";
  if (!allowedFormats?.toString().includes(format.toString())) {
    return { ok: false, json: async () => ({ error: { message: "Format not allowed" } }) };
  }

  // Simulación de rechazo por tamaño
  const size = Number(formData.get("size")) || 1000;
  if (size > Number(maxImageSize)) {
    return { ok: false, json: async () => ({ error: { message: "File size too large" } }) };
  }

  return { ok: true, json: async () => ({ secure_url: "https://mock.url/image.jpg" }) };
};

// 3. Tests
describe("Media Router - /sign", () => {
  let app: Hono;
  
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CLOUDINARY_CLOUD_NAME = "testcloud";
    process.env.CLOUDINARY_API_KEY = "12345";
    process.env.CLOUDINARY_API_SECRET = "secret";

    app = new Hono();
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json({ error: err.message, code: err.code }, err.statusCode as any);
      }
      return c.json({ error: err.message }, 500);
    });
    app.route("/media", mediaRouter);
  });

  it("debe rechazar la petición sin token de autenticación (401)", async () => {
    const res = await app.request("/media/sign");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Token de autorización requerido");
  });

  it("debe rechazar la petición si el usuario no es administrador (403)", async () => {
    const res = await app.request("/media/sign", {
      headers: {
        Authorization: "Bearer mock-client",
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Acceso denegado. Se requiere rol de administrador.");
  });

  it("debe retornar 500 si falta configuración de Cloudinary", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    const res = await app.request("/media/sign", {
      headers: { Authorization: "Bearer mock-admin" },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Falta configuración de Cloudinary en el servidor");
  });

  it("debe generar la firma con límites de tamaño y formato", async () => {
    const res = await app.request("/media/sign", {
      headers: { Authorization: "Bearer mock-admin" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.signature).toBe("mocked-signature-1234");
    expect(body.data.allowed_formats).toBe("jpg,png,webp,svg");
    expect(body.data.max_image_file_size).toBe(5242880);
  });

  describe("Integración simulada con Cloudinary (validación por firma)", () => {
    it("Cloudinary rechaza la subida si el formato no está permitido", async () => {
      const formData = new FormData();
      formData.append("allowed_formats", "jpg,png,webp,svg");
      formData.append("max_image_file_size", "5242880");
      formData.append("signature", "mocked-signature-1234");
      formData.append("format", "pdf"); // Archivo no permitido

      const res = await mockCloudinaryFetch(formData);
      expect(res.ok).toBe(false);
      const json = await res.json() as { error: { message: string } };
      expect(json.error.message).toBe("Format not allowed");
    });

    it("Cloudinary rechaza la subida si el archivo es demasiado grande", async () => {
      const formData = new FormData();
      formData.append("allowed_formats", "jpg,png,webp,svg");
      formData.append("max_image_file_size", "5242880"); // 5MB
      formData.append("signature", "mocked-signature-1234");
      formData.append("format", "jpg");
      formData.append("size", "6000000"); // 6MB, excede el límite

      const res = await mockCloudinaryFetch(formData);
      expect(res.ok).toBe(false);
      const json = await res.json() as { error: { message: string } };
      expect(json.error.message).toBe("File size too large");
    });

    it("Cloudinary rechaza la subida si la firma es inválida o parámetros modificados", async () => {
      const formData = new FormData();
      formData.append("allowed_formats", "jpg,png,webp,svg");
      formData.append("max_image_file_size", "10000000"); // Un atacante intenta aumentar el tamaño en cliente
      // Como alteró un parámetro sin refirmarlo en el backend, la firma no coincide con el nuevo tamaño.
      // Cloudinary calculará su propia firma en base a los parámetros recibidos y no coincidirá.
      formData.append("signature", "invalidated-signature");
      
      const res = await mockCloudinaryFetch(formData);
      expect(res.ok).toBe(false);
      const json = await res.json() as { error: { message: string } };
      expect(json.error.message).toBe("Invalid signature");
    });
  });
});
