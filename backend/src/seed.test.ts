import { describe, expect, it } from "vitest";
import { isCloudinaryImageUrl, resolveSeedImages } from "./seed.js";

describe("imágenes del seeder", () => {
  it("reconoce URLs de imágenes alojadas en Cloudinary", () => {
    expect(isCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/f_auto/product.jpg")).toBe(true);
    expect(isCloudinaryImageUrl("https://picsum.photos/seed/product/600/800")).toBe(false);
  });

  it("prioriza las imágenes Cloudinary existentes sobre las imágenes de stock", () => {
    const fallbackImages = ["https://picsum.photos/seed/product/600/800"];
    const existingImages = [
      "https://picsum.photos/seed/old-product/600/800",
      "https://res.cloudinary.com/demo/image/upload/f_auto/product.jpg",
    ];

    expect(resolveSeedImages(fallbackImages, existingImages)).toEqual([
      "https://res.cloudinary.com/demo/image/upload/f_auto/product.jpg",
    ]);
  });

  it("mantiene las imágenes de stock cuando no existe una imagen Cloudinary", () => {
    const fallbackImages = [
      "https://picsum.photos/seed/product/600/800",
      "https://picsum.photos/seed/product-detail/600/800",
    ];

    expect(resolveSeedImages(fallbackImages, ["https://example.com/product.jpg"])).toEqual(fallbackImages);
  });
});
