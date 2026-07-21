import type { Event } from "../types/Event";

const EVENTS_KEY = "oshi-memo-events";

export function loadEvents(): Event[] {
  const data = localStorage.getItem(EVENTS_KEY);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data) as Event[];
  } catch {
    return [];
  }
}

export function saveEvents(events: Event[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}