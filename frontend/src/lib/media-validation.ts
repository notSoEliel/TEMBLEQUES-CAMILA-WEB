export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const IMAGE_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp";

export function validateProductImage(file: Pick<File, "type" | "size">): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return "Formato no soportado. Usa JPG, PNG o WEBP.";
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return "El archivo es demasiado pesado. Máximo permitido: 5 MB.";
  }

  return null;
}
