import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  validateProductImage,
} from "./media-validation";

describe("validateProductImage", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])(
    "acepta el formato %s dentro del límite",
    (type) => {
      expect(validateProductImage({ type, size: MAX_IMAGE_FILE_SIZE_BYTES })).toBeNull();
    },
  );

  it("bloquea formatos no permitidos", () => {
    expect(validateProductImage({ type: "image/svg+xml", size: 1024 })).toBe(
      "Formato no soportado. Usa JPG, PNG o WEBP.",
    );
  });

  it("bloquea archivos mayores de 5 MB", () => {
    expect(validateProductImage({ type: "image/jpeg", size: MAX_IMAGE_FILE_SIZE_BYTES + 1 })).toBe(
      "El archivo es demasiado pesado. Máximo permitido: 5 MB.",
    );
  });
});
