export interface MaintenanceDateRange {
  startDate: Date;
  endDate: Date;
}

export function parseMaintenanceRange(start: string, end: string): MaintenanceDateRange | null {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) return null;
  return { startDate, endDate };
}

export function maintenanceRangesOverlap(first: MaintenanceDateRange, second: MaintenanceDateRange): boolean {
  return first.startDate < second.endDate && first.endDate > second.startDate;
}
