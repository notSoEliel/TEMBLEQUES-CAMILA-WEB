const PANAMA_UTC_OFFSET_HOURS = -5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getPanamaTodayUTC(now = new Date()): Date {
  const panamaTime = new Date(now.getTime() + PANAMA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return new Date(Date.UTC(
    panamaTime.getUTCFullYear(),
    panamaTime.getUTCMonth(),
    panamaTime.getUTCDate(),
  ));
}

function getUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const PAYMENT_RULES = {
  depositThresholdUsd: parsePositiveNumber(process.env.STRIPE_DEPOSIT_THRESHOLD_USD, 350),
  depositRate: parsePositiveNumber(process.env.STRIPE_DEPOSIT_RATE, 0.35),
  lateFeeDailyRate: parsePositiveNumber(process.env.STRIPE_LATE_FEE_DAILY_RATE, 1),
};

export function calculateRentalDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.max(Math.ceil(diffTime / MS_PER_DAY), 1);
}

export function evaluateDeposit(
  total: number,
  productSettings?: { required: boolean; overrideAmount?: number }
): { required: boolean; amount: number } {
  // 1. If product explicitly overrides the required flag
  if (productSettings) {
    if (!productSettings.required) {
      return { required: false, amount: 0 };
    }
    // If required and has an override amount, use it
    if (productSettings.overrideAmount !== undefined && productSettings.overrideAmount > 0) {
      return { required: true, amount: roundMoney(productSettings.overrideAmount) };
    }
    // If required but no override amount, calculate standard percentage
    return {
      required: true,
      amount: roundMoney(total * PAYMENT_RULES.depositRate),
    };
  }

  // 2. Fallback to global threshold
  if (total < PAYMENT_RULES.depositThresholdUsd) {
    return { required: false, amount: 0 };
  }
  return {
    required: true,
    amount: roundMoney(total * PAYMENT_RULES.depositRate),
  };
}

export function calculateLateDays(endDate: Date, now = new Date()): number {
  const todayPanama = getPanamaTodayUTC(now);
  const endDateUTC = getUTCDateOnly(endDate);
  const diff = todayPanama.getTime() - endDateUTC.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
}

export function calculateLateFeeAmount(params: {
  total: number;
  startDate: Date;
  endDate: Date;
  lateDays: number;
}): number {
  const { total, startDate, endDate, lateDays } = params;
  if (lateDays <= 0) {
    return 0;
  }
  const rentalDays = calculateRentalDays(startDate, endDate);
  const baseDailyRate = total / rentalDays;
  const lateDailyRate = baseDailyRate * PAYMENT_RULES.lateFeeDailyRate;
  return roundMoney(lateDailyRate * lateDays);
}
