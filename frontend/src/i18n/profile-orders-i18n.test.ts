import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatLocalizedDate } from "@/lib/utils";
import { hasTranslation, translate, type Language } from "@/i18n";

const SCREEN_FILES = [
  new URL("../pages/Profile.tsx", import.meta.url),
  new URL("../pages/Orders.tsx", import.meta.url),
  new URL("../pages/Confirmation.tsx", import.meta.url),
];

function translationKeysUsedByScreens(): string[] {
  const keys = SCREEN_FILES.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/\bt\("([^"]+)"\)/g)].map((match) => match[1]);
  });

  return [...new Set(keys)].sort();
}

describe("traducciones del flujo de alquileres", () => {
  const keys = translationKeysUsedByScreens();

  it.each<Language>(["es", "en"])(
    "define cada clave visible en %s",
    (language) => {
      const missingKeys = keys.filter((key) => !hasTranslation(language, key));
      expect(missingKeys).toEqual([]);
    },
  );

  it.each<Language>(["es", "en"])(
    "no devuelve claves crudas en %s",
    (language) => {
      const rawKeys = keys.filter((key) => translate(language, key) === key);
      expect(rawKeys).toEqual([]);
    },
  );
});

describe("formato de fechas del flujo de alquileres", () => {
  it("formatea fechas ISO completas sin producir Invalid Date", () => {
    const value = "2026-07-24T00:00:00.000Z";

    expect(formatLocalizedDate(value, "es")).toContain("2026");
    expect(formatLocalizedDate(value, "en")).toContain("2026");
    expect(formatLocalizedDate(value, "es")).not.toContain("Invalid");
    expect(formatLocalizedDate(value, "en")).not.toContain("Invalid");
  });

  it("usa un fallback seguro para fechas inválidas", () => {
    expect(formatLocalizedDate("not-a-date", "es")).toBe("—");
  });
});
