import { Hono } from "hono";
import { validateImageFile } from "../lib/media.js";
import { AppError } from "../lib/errors.js";

const mediaRouter = new Hono();

const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || "dfshkpehf";
const CLOUDINARY_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "TemblequesCamila";

function applyWebpTransform(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
}

mediaRouter.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined; // En el frontend envían "file"

  if (!file) {
    throw new AppError("No se ha enviado ninguna imagen.", 400, "VALIDATION_ERROR");
  }

  // 1. Validar la imagen (Magic Bytes y tamaño)
  await validateImageFile(file);

  // 2. Reenviar el archivo a Cloudinary
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new AppError(`Error de Cloudinary: ${res.statusText}`, 502, "EXTERNAL_API_ERROR");
    }

    const data = (await res.json()) as any;
    const finalUrl = applyWebpTransform(data.secure_url);

    return c.json({
      success: true,
      url: finalUrl,
    });
  } catch (err: any) {
    console.error("[Media Route] Error subiendo a Cloudinary:", err);
    if (err instanceof AppError) throw err;
    throw new AppError("No se pudo procesar la subida de la imagen.", 500, "INTERNAL_ERROR");
  }
});

export default mediaRouter;
