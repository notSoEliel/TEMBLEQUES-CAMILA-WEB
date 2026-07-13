import { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../lib/errors.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const mediaRouter = new Hono();

mediaRouter.use("/sign", authMiddleware, requireAdmin);

mediaRouter.get("/sign", async (c) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError("Falta configuración de Cloudinary en el servidor", 500, "INTERNAL_ERROR");
    }

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Parámetros obligatorios que Cloudinary validará
    const paramsToSign = {
      timestamp,
      allowed_formats: "jpg,png,webp,svg",
      max_image_file_size: 5242880, // 5MB
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return c.json({
      success: true,
      data: {
        timestamp,
        signature,
        apiKey,
        cloudName,
        allowed_formats: paramsToSign.allowed_formats,
        max_image_file_size: paramsToSign.max_image_file_size,
      },
    });
  } catch (error) {
    console.error("[Cloudinary Sign Error]:", error);
    if (error instanceof AppError) throw error;
    throw new AppError("Error generando firma de subida", 500, "SIGNATURE_ERROR");
  }
});

export default mediaRouter;
