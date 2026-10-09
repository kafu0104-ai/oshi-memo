import { withPersonalDataLock } from "./personalDataLock";
import { assertOffsetPreserved } from "./settlementOffsets";
import type { EventTicketChanges } from "./eventTicketDraft";
import { mergeEventTickets } from "./eventTickets";
import { generateId } from "./id";
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
function writeEvents(
  events: Event[],
  changes?: EventTicketChanges & { eventId: string },
): void {
  const previous=localStorage.getItem(EVENTS_KEY);
  const previousTickets=localStorage.getItem(TICKETS_KEY);
  const previousCompanions=localStorage.getItem(COMPANIONS_KEY);
  const tickets=loadTickets();
  const nextTickets=mergeEventTickets(events,loadEvents(),tickets,generateId);
  if(changes?.receptions.length){
    let ticket=nextTickets.find(t=>t.eventId===changes.eventId);
    if(!ticket){ticket={id:generateId(),eventId:changes.eventId,receptions:[]};nextTickets.push(ticket);}
    for(const reception of changes.receptions){
      const existing=ticket.receptions.find(r=>r.sourceEntryPeriodId===reception.sourceEntryPeriodId);
      const updated={...reception,id:existing?.id ?? reception.id};
      ticket.receptions=existing?ticket.receptions.map(r=>r.id===existing.id?updated:r):[...ticket.receptions,updated];
    }
  }
  assertOffsetPreserved(tickets,nextTickets);
  if (tickets.some(t=>t.receptions.some(r=>r.applications.some(a=>a.fulfillment?.payment.settlements.some(s=>s.offsetAmount!==undefined))) && !events.some(e=>e.id===t.eventId))) throw new Error("相殺履歴のあるイベントは削除できません。履歴を残すため、過去のイベントとして保管してください。");
  try {
    if(changes?.companions.length){
      const companions=loadCompanions();
      saveCompanions([...companions.map(c=>changes.companions.find(item=>item.id===c.id)??c),...changes.companions.filter(c=>!companions.some(existing=>existing.id===c.id))]);
    }
    saveArray(EVENTS_KEY, events);
    if(JSON.stringify(nextTickets)!==JSON.stringify(tickets))writeTickets(nextTickets);
  } catch(error) {
    for(const [key,value] of [[EVENTS_KEY,previous],[TICKETS_KEY,previousTickets],[COMPANIONS_KEY,previousCompanions]] as const){
      if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
    }
    throw error;
  }
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
function writeTickets(
  tickets: Ticket[],
): void {
  assertOffsetPreserved(loadTickets(), tickets);
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
function writeTicket(
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

  writeTickets(tickets);
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
/** Save a ticket and newly added companions together; restore companions if ticket storage fails. */
function writeTicketWithCompanions(ticket: Ticket, additions: Companion[]): void {
  if (additions.length === 0) { writeTicket(ticket); return; }
  const previous = localStorage.getItem(COMPANIONS_KEY);
  const companions = loadCompanions();
  saveCompanions([...companions.map(c=>additions.find(item=>item.id===c.id)??c), ...additions.filter(c => !companions.some(existing => existing.id === c.id))]);
  try { writeTicket(ticket); }
  catch (error) {
    if (previous === null) localStorage.removeItem(COMPANIONS_KEY);
    else localStorage.setItem(COMPANIONS_KEY, previous);
    throw error;
  }
}

export function saveEvents(events: Event[], changes?: EventTicketChanges & { eventId: string }): Promise<void> {
  return withPersonalDataLock(() => writeEvents(events, changes));
}
export function saveTickets(tickets: Ticket[]): Promise<void> {
  return withPersonalDataLock(() => writeTickets(tickets));
}
export function saveTicket(ticket: Ticket): Promise<void> {
  return withPersonalDataLock(() => writeTicket(ticket));
}
export function saveTicketWithCompanions(ticket: Ticket, additions: Companion[]): Promise<void> {
  return withPersonalDataLock(() => writeTicketWithCompanions(ticket, additions));
}
/** Balances and histories share the existing tickets key: one atomic setItem, no partial commit. */
export function transactTicketSettlements<T>(operation: (tickets: Ticket[], events: Event[]) => { tickets: Ticket[]; result: T }, requireLock = false): Promise<T> {
  return withPersonalDataLock(() => {
    const { tickets, result } = operation(loadTickets(), loadEvents());
    saveArray(TICKETS_KEY, tickets);
    return result;
  }, requireLock);
}
