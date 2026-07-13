import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../lib/errors.js";

type TestUser = {
  role: "client" | "admin";
  name: string;
};

type TestEnvironment = {
  Variables: {
    user: TestUser;
  };
};

const { apiSignRequestMock } = vi.hoisted(() => ({
  apiSignRequestMock: vi.fn(() => "mocked-signature-1234"),
}));

vi.mock("cloudinary", () => ({
  v2: {
    utils: {
      api_sign_request: apiSignRequestMock,
    },
  },
}));

vi.mock("../middleware/auth.js", () => ({
  authMiddleware: async (c: Context<TestEnvironment>, next: Next) => {
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
  requireAdmin: async (c: Context<TestEnvironment>, next: Next) => {
    const user = c.get("user");
    if (user.role !== "admin") {
      throw new AppError(
        "Acceso denegado. Se requiere rol de administrador.",
        403,
        "AUTH_FORBIDDEN",
      );
    }

    await next();
  },
}));

import mediaRouter from "./media.js";

describe("Media Router - /sign", () => {
  let app: Hono<TestEnvironment>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CLOUDINARY_CLOUD_NAME = "testcloud";
    process.env.CLOUDINARY_API_KEY = "12345";
    process.env.CLOUDINARY_API_SECRET = "secret";
    process.env.CLOUDINARY_UPLOAD_PRESET = "tembleques_products_signed";
    apiSignRequestMock.mockClear();

    app = new Hono<TestEnvironment>();
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json(
          { error: err.message, code: err.code },
          err.statusCode as ContentfulStatusCode,
        );
      }

      return c.json({ error: err.message }, 500);
    });
    app.route("/media", mediaRouter);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("debe rechazar la petición sin token de autenticación (401)", async () => {
    const res = await app.request("/media/sign");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Token de autorización requerido");
  });

  it("debe rechazar la petición si el usuario no es administrador (403)", async () => {
    const res = await app.request("/media/sign", {
      headers: { Authorization: "Bearer mock-client" },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Acceso denegado. Se requiere rol de administrador.");
  });

  it.each([
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_PRESET",
  ])("debe retornar 500 si falta %s", async (variable) => {
    delete process.env[variable];

    const res = await app.request("/media/sign", {
      headers: { Authorization: "Bearer mock-admin" },
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Falta configuración de Cloudinary en el servidor");
    expect(body.code).toBe("CLOUDINARY_CONFIG_MISSING");
  });

  it("debe firmar únicamente timestamp y upload_preset", async () => {
    const res = await app.request("/media/sign", {
      headers: { Authorization: "Bearer mock-admin" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.signature).toBe("mocked-signature-1234");
    expect(body.data.timestamp).toEqual(expect.any(Number));
    expect(body.data.apiKey).toBe("12345");
    expect(body.data.cloudName).toBe("testcloud");
    expect(body.data.uploadPreset).toBe("tembleques_products_signed");
    expect(body.data).not.toHaveProperty("apiSecret");
    expect(body.data).not.toHaveProperty("allowed_formats");
    expect(body.data).not.toHaveProperty("max_image_file_size");
    expect(apiSignRequestMock).toHaveBeenCalledWith(
      {
        timestamp: body.data.timestamp,
        upload_preset: "tembleques_products_signed",
      },
      "secret",
    );
  });
});
