export interface AvailabilityConflict {
  startDate: Date;
  endDate: Date;
}

function normalizeToMidday(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(12, 0, 0, 0);
  return normalized;
}

export function hasAvailableStock(
  stock: number,
  startDate: Date,
  endDate: Date,
  conflicts: AvailabilityConflict[],
): boolean {
  if (stock <= 0 || startDate > endDate) return false;

  const current = normalizeToMidday(startDate);
  const end = normalizeToMidday(endDate);

  while (current <= end) {
    const concurrentCount = conflicts.filter((conflict) => {
      const conflictStart = normalizeToMidday(conflict.startDate);
      const conflictEnd = normalizeToMidday(conflict.endDate);
      return current >= conflictStart && current <= conflictEnd;
    }).length;

    if (concurrentCount >= stock) return false;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return true;
}
