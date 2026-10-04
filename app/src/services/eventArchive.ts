import type { AttendanceEntry, Event } from '../types/Event';

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The form seeds a completely empty pending entry even for non-lottery events.
// It is a placeholder, not another undated visit. Keep meaningful undated visits.
function recordedVisit(item: AttendanceEntry): boolean {
  return item.result !== '落選' && !!(item.date || item.time || item.result === '当選');
}

// Personal visits take precedence over the public exhibition/shop period.
// Keep undated or partly scheduled events active rather than hiding them early.
export function eventLastDate(event: Event): string | undefined {
  const visits = [
    ...(event.performances ?? []).map(item => item.date),
    ...(event.attendanceDate ? [event.attendanceDate] : []),
    ...(event.attendanceEntries ?? []).filter(recordedVisit).map(item => item.date),
    ...(event.entryPeriods ?? []).flatMap(period => period.entries.filter(recordedVisit).map(item => item.date)),
  ];
  if (visits.length) return visits.every(validDate) ? visits.sort().at(-1) : undefined;
  const end = event.endDate || event.startDate;
  if (!validDate(end)) return undefined;
  if (event.startDate && (!validDate(event.startDate) || event.startDate > end)) return undefined;
  return end;
}

export function isPastEvent(event: Event, today: string): boolean {
  const end = eventLastDate(event);
  return !!end && end < today;
}
