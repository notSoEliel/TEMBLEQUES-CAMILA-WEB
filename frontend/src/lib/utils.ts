import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "PAB",
  }).format(amount);
}

export function getLocalizedText(esText: string, enText: string | undefined | null, currentLang: string): string {
  if (currentLang === "en" && enText && enText.trim().length > 0) {
    return enText;
  }
  return esText;
}

const DEFAULT_CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  pollera: { es: "Polleras", en: "Polleras" },
  vestuario_masculino: { es: "Vestuario Masculino", en: "Men's Attire" },
  infantil: { es: "Infantil", en: "Children's" },
  tembleques: { es: "Tembleques", en: "Tembleques" },
  accesorios: { es: "Accesorios", en: "Accessories" },
  paquete_completo: { es: "Paquetes Completos", en: "Complete Sets" },
};

interface CategoryLabelConfig {
  label?: string | null;
  label_en?: string | null;
}

export function getLocalizedCategoryLabel(
  categoryId: string,
  category: CategoryLabelConfig | undefined,
  currentLang: string,
  fallbackLabel?: string,
): string {
  const defaults = DEFAULT_CATEGORY_LABELS[categoryId];
  const spanishLabel = category?.label?.trim() || defaults?.es || fallbackLabel || categoryId;
  const englishLabel = category?.label_en?.trim() || defaults?.en || spanishLabel;

  return currentLang === "en" ? englishLabel : spanishLabel;
}
