import { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../lib/errors.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

interface CloudinaryConfiguration {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
}

function getCloudinaryConfiguration(): CloudinaryConfiguration {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    throw new AppError(
      "Falta configuración de Cloudinary en el servidor",
      500,
      "CLOUDINARY_CONFIG_MISSING",
    );
  }

  return { cloudName, apiKey, apiSecret, uploadPreset };
}

const mediaRouter = new Hono();

mediaRouter.use("/sign", authMiddleware, requireAdmin);

mediaRouter.get("/sign", (c) => {
  const { cloudName, apiKey, apiSecret, uploadPreset } = getCloudinaryConfiguration();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, upload_preset: uploadPreset };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return c.json({
    success: true,
    data: {
      timestamp,
      signature,
      apiKey,
      cloudName,
      uploadPreset,
    },
  });
});

export default mediaRouter;
