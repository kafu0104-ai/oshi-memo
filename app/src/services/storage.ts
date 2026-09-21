import type { Event } from "../types/Event";
import type { Ticket } from "../types/Ticket";
import type { Companion } from "../types/Companion";

/* ========================================
   Storage Keys
======================================== */

const EVENTS_KEY = "oshi-memo-events";
const TICKETS_KEY = "oshi-memo-tickets";
const COMPANIONS_KEY = "oshi-memo-companions";


/* ========================================
   Common
======================================== */

/**
 * localStorage から配列データを読み込む
 */
function loadArray<T>(key: string): T[] {
  const data = localStorage.getItem(key);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);

    return Array.isArray(parsed)
      ? (parsed as T[])
      : [];
  } catch {
    return [];
  }
}

/**
 * localStorage に配列データを保存する
 */
function saveArray<T>(
  key: string,
  items: T[],
): void {
  localStorage.setItem(
    key,
    JSON.stringify(items),
  );
}


/* ========================================
   Events
======================================== */

/**
 * イベント一覧を読み込む
 */
export function loadEvents(): Event[] {
  return loadArray<Event>(EVENTS_KEY);
}

/**
 * イベント一覧を保存する
 */
export function saveEvents(
  events: Event[],
): void {
  saveArray(EVENTS_KEY, events);
}


/* ========================================
   Tickets
======================================== */

/**
 * チケット管理データをすべて読み込む
 */
export function loadTickets(): Ticket[] {
  return loadArray<Ticket>(TICKETS_KEY);
}

/**
 * チケット管理データをすべて保存する
 */
export function saveTickets(
  tickets: Ticket[],
): void {
  saveArray(TICKETS_KEY, tickets);
}

/**
 * 指定したイベントのチケット情報を取得する
 */
export function loadTicketByEventId(
  eventId: string,
): Ticket | undefined {
  const tickets = loadTickets();

  return tickets.find(
    (ticket) => ticket.eventId === eventId,
  );
}

/**
 * チケット情報を新規保存・更新する
 *
 * 同じ id のTicketが存在する場合は更新、
 * 存在しない場合は追加する。
 */
export function saveTicket(
  ticket: Ticket,
): void {
  const tickets = loadTickets();

  const existingIndex = tickets.findIndex(
    (item) => item.id === ticket.id,
  );

  if (existingIndex >= 0) {
    tickets[existingIndex] = ticket;
  } else {
    tickets.push(ticket);
  }

  saveTickets(tickets);
}


/* ========================================
   Companions
======================================== */

/**
 * 同行者一覧を読み込む
 */
export function loadCompanions(): Companion[] {
  return loadArray<Companion>(
    COMPANIONS_KEY,
  );
}

/**
 * 同行者一覧を保存する
 */
export function saveCompanions(
  companions: Companion[],
): void {
  saveArray(
    COMPANIONS_KEY,
    companions,
  );
}

/**
 * 同行者を新規保存・更新する
 */
export function saveCompanion(
  companion: Companion,
): void {
  const companions = loadCompanions();

  const existingIndex =
    companions.findIndex(
      (item) =>
        item.id === companion.id,
    );

  if (existingIndex >= 0) {
    companions[existingIndex] =
      companion;
  } else {
    companions.push(companion);
  }

  saveCompanions(companions);
}