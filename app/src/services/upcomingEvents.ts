import type { Event } from "../types/Event";

export function nextDate(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
}

/** Reserve a place for tomorrow when both today and tomorrow have events. */
export function upcomingEvents(events: Event[], today: string): Event[] {
  const tomorrow = nextDate(today);
  const candidates = events.flatMap(event => {
    if (event.entryPeriods && event.tagIds?.includes("goods-sale")) {
      const next = event.entryPeriods.flatMap(period=>period.entries.filter(entry=>period.method !== "抽選" || entry.result === "当選")).filter(entry=>entry.date >= today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0];
      return next ? [{...event,startDate:next.date,endDate:next.date}] : [];
    }
    if (event.attendanceEntries && event.tagIds?.includes("goods-sale") && event.genreDetails?.entryMethod === "抽選") {
      const next = event.attendanceEntries.filter(entry=>entry.result === "当選" && entry.date >= today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0];
      return next ? [{...event,startDate:next.date,endDate:next.date}] : [];
    }
    if (event.tagIds?.includes("goods-sale") && event.genreDetails?.entryMethod === "抽選" && event.genreDetails?.entryResult !== "当選") return [];
    const performanceDate = event.performances?.map(p=>p.date).filter(date=>date && date >= today).sort()[0];
    const personalDate = event.attendanceDate && event.attendanceDate >= today ? event.attendanceDate : performanceDate;
    if (personalDate) return { ...event, startDate: personalDate, endDate: personalDate };
    if (event.attendanceDate) return { ...event, startDate: event.attendanceDate, endDate: event.attendanceDate };
    return event;
  }).filter(event => event.startDate && (event.endDate || event.startDate) >= today)
    .sort((a,b) => (a.startDate < today ? today : a.startDate).localeCompare(b.startDate < today ? today : b.startDate)
      || b.startDate.localeCompare(a.startDate) || a.title.localeCompare(b.title));
  const todayEvent = candidates.find(event => event.startDate <= today);
  const tomorrowEvent = candidates.find(event => event.startDate === tomorrow);
  if (todayEvent && tomorrowEvent) return [todayEvent, tomorrowEvent];
  return candidates.slice(0,2);
}
