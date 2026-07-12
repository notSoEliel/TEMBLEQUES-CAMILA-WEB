import { AppError } from "./errors.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes

/**
 * Verifica la firma hexadecimal (magic bytes) de un archivo para validar su formato real.
 */
async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const arr = new Uint8Array(buffer).subarray(0, 12);
  const header = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  // Firmas conocidas (Magic Bytes)
  const magicNumbers = {
    JPEG: /^FFD8FF/,
    PNG: /^89504E47/,
    WEBP: /^52494646(.*)57454250/, // RIFF...WEBP
  };

  const isJPEG = magicNumbers.JPEG.test(header);
  const isPNG = magicNumbers.PNG.test(header);
  const isWEBP = magicNumbers.WEBP.test(header);

  // SVG es basado en texto, se revisa buscando las etiquetas iniciales.
  // Es recomendable una sanitización extra (DOMPurify) en caso de usar SVG.
  let isSVG = false;
  if (!isJPEG && !isPNG && !isWEBP && file.type === "image/svg+xml") {
    const text = await file.slice(0, 100).text();
    isSVG = text.includes("<svg") || text.includes("<?xml");
  }

  return isJPEG || isPNG || isWEBP || isSVG;
}

/**
 * Valida un archivo de imagen asegurando peso y formato real.
 * Lanza un AppError en caso de fallo.
 */
export async function validateImageFile(file: File | string | null): Promise<void> {
  if (!file || typeof file === "string") {
    throw new AppError("No se ha proporcionado un archivo válido.", 400, "VALIDATION_ERROR");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      "El tamaño de la imagen excede el límite de 5MB.",
      400,
      "VALIDATION_ERROR"
    );
  }

  const isValidFormat = await validateImageMagicBytes(file);
  if (!isValidFormat) {
    throw new AppError(
      "El formato de la imagen no está permitido o el archivo está corrupto. Formatos válidos: JPEG, PNG, WEBP, SVG.",
      400,
      "VALIDATION_ERROR"
    );
  }
}
