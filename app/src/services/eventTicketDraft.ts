import type { EntryPeriod } from '../types/Event';
import type { TicketReception } from '../types/Ticket';
import type { Companion } from '../types/Companion';

export interface EventTicketChanges {
  receptions: TicketReception[];
  companions: Companion[];
}
export interface EntryTicketDraft {
  reception: TicketReception;
  companions: Companion[];
  error: string;
}
export const supportsInlineTicket = (method: string) => ['抽選','当日購入','事前予約・購入','先着（売切れ次第終了）','先着・予約','予約'].includes(method);

/** Seed from the latest ticket record, keeping all payment and fulfillment details. */
export function entryTicketDraft(period: EntryPeriod, existing: TicketReception | undefined, id: () => string): TicketReception {
  if (existing) return {...existing, sourceEntryPeriodId: period.id, receptionType:period.method==='抽選'?'lottery':period.method==='当日購入'?'admission':existing.receptionType==='lottery'?'general':existing.receptionType};
  const seatId = period.ticketPrice === undefined ? undefined : id();
  return {
    id:id(), sourceEntryPeriodId:period.id, name:period.name || '',
    receptionType:period.method === '抽選' ? 'lottery' : period.method === '当日購入' ? 'admission' : 'general',
    applicationStartDate:period.applicationStart?.split('T')[0], applicationStartTime:period.applicationStart?.split('T')[1],
    applicationDeadlineDate:period.applicationEnd?.split('T')[0], applicationDeadlineTime:period.applicationEnd?.split('T')[1],
    resultDate:period.resultDate || undefined,resultTime:period.resultTime || undefined,
    seatTypes:seatId ? [{id:seatId,name:'チケット',price:period.ticketPrice!}] : [], fees:[],
    applications:[{id:id(),seatTypeId:seatId,quantity:period.ticketQuantity ?? 1,companionIds:[],status:period.method==='抽選' ? period.ticketStatus ?? 'notApplied' : period.ticketPurchased ? 'won' : 'notApplied',
      fulfillment:{payment:{payerId:period.ticketPayerId || 'self',isPaid:period.ticketPurchased ?? false,settlements:[],deadlineDate:period.paymentDeadline},issuance:{isIssued:false},distributions:[],seatAssignments:[]}}],
  };
}
