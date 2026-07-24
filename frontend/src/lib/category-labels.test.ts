import { describe, expect, it } from "vitest";
import { getLocalizedCategoryLabel } from "./utils";

describe("getLocalizedCategoryLabel", () => {
  it("usa la traducción guardada por el admin", () => {
    expect(getLocalizedCategoryLabel(
      "infantil",
      { label: "Infantil", label_en: "Children's Wear" },
      "en",
    )).toBe("Children's Wear");
  });

  it("usa la traducción predeterminada cuando la configuración existente aún no tiene label_en", () => {
    expect(getLocalizedCategoryLabel(
      "vestuario_masculino",
      { label: "Vestuario Masculino" },
      "en",
    )).toBe("Men's Attire");
  });

  it("conserva el nombre público en español", () => {
    expect(getLocalizedCategoryLabel(
      "infantil",
      { label: "Ropa infantil", label_en: "Children's Wear" },
      "es",
    )).toBe("Ropa infantil");
  });
});
