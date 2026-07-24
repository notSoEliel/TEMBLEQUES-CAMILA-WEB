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
