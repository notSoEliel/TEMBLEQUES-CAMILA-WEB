import { describe, expect, it } from "vitest";
import { buildProductSeedUpdate } from "./seed.js";

describe("protección de productos existentes", () => {
  it("solo configura datos semilla cuando el producto se inserta", () => {
    const fixture = {
      seed_key: "producto-de-prueba",
      name: "Producto de prueba",
      category: ["accesorios"],
      description: "Descripción de prueba",
      rental_price: 10,
      variants: [{ size: "Único", stock: 1, in_maintenance: false }],
      images: ["https://picsum.photos/seed/producto/600/800"],
      deposit_settings: { required: true },
    };

    expect(buildProductSeedUpdate(fixture)).toEqual({
      $setOnInsert: fixture,
    });
    expect(buildProductSeedUpdate(fixture)).not.toHaveProperty("$set");
  });
});
