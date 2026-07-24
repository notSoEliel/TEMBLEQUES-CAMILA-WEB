import { describe, expect, it } from "vitest";
import { formatLocalizedDate } from "@/lib/utils";
import { hasTranslation, translate, type Language } from "@/i18n";

const RENTAL_FLOW_TRANSLATION_KEYS = [
  "checkout.summaryTitle",
  "confirm.detailsTitle",
  "confirm.endDateLabel",
  "confirm.idLabel",
  "confirm.processingDetails",
  "confirm.productLabel",
  "confirm.startDateLabel",
  "confirm.statusLabel",
  "confirm.successSubtitle",
  "confirm.successTitle",
  "confirm.totalLabel",
  "confirm.verifying",
  "orders.cancelBtn",
  "orders.cancelError",
  "orders.cleaningInsurance",
  "orders.closeBtn",
  "orders.comboPremium",
  "orders.dateSeparator",
  "orders.datesReservation",
  "orders.detailTitle",
  "orders.detailsBtn",
  "orders.financialSummary",
  "orders.historyTitleAccent",
  "orders.historyTitlePrefix",
  "orders.included",
  "orders.includedItems",
  "orders.loading",
  "orders.noOrders",
  "orders.orderPlacedOn",
  "orders.payRentalBtn",
  "orders.periodInfo",
  "orders.receiptBtn",
  "orders.receiptError",
  "orders.rentalProgress",
  "orders.returnPolicy",
  "orders.returnPolicyDesc",
  "orders.seedStatusNote",
  "orders.statusUpdatedTo",
  "orders.supportBtn",
  "orders.tabActive",
  "orders.tabCancelled",
  "orders.total",
  "profile.activeRentals",
  "profile.bundle",
  "profile.culturalInvestment",
  "profile.folkloreCollection",
  "profile.latestPiece",
  "profile.loadingRentals",
  "profile.manageRental",
  "profile.pieces",
  "profile.recentOrderTitle",
  "profile.rentalPiece",
  "profile.viewFullHistory",
  "status.cancelled",
  "status.confirmed",
  "status.damaged",
  "status.delivered",
  "status.late",
  "status.paid",
  "status.pending",
  "status.reserved",
  "status.returned",
  "status.unknown",
] as const;

describe("traducciones del flujo de alquileres", () => {
  it.each<Language>(["es", "en"])(
    "define cada clave visible en %s",
    (language) => {
      const missingKeys = RENTAL_FLOW_TRANSLATION_KEYS.filter(
        (key) => !hasTranslation(language, key),
      );
      expect(missingKeys).toEqual([]);
    },
  );

  it.each<Language>(["es", "en"])(
    "no devuelve claves crudas en %s",
    (language) => {
      const rawKeys = RENTAL_FLOW_TRANSLATION_KEYS.filter(
        (key) => translate(language, key) === key,
      );
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
