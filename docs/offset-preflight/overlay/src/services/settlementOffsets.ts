import { needsDirectionReview } from './settlementConsistency';
import type { Ticket, TicketSettlement } from '../types/Ticket';
import type { SettlementRef, SettlementOffset, OffsetAllocation } from '../types/SettlementOffset';
import type { Event } from '../types/Event';
import { settlementAmount } from './ticketAmounts';

export const settlementKey = (ref: SettlementRef) => JSON.stringify([ref.ticketId, ref.receptionId, ref.applicationId, ref.settlementId]);
export const hasOffset = (s: TicketSettlement) => s.offsetAmount !== undefined;
export function yen(value: number | undefined): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) throw new Error('金額が未設定、または円単位の整数ではありません。チケット情報を確認してください。');
  return value;
}
export function remainingAmount(total: number | undefined, settlement: TicketSettlement): number | undefined {
  if (total === undefined) return undefined;
  if (!hasOffset(settlement)) return settlement.isSettled ? 0 : total;
  const remaining = yen(total) - yen(settlement.offsetAmount) - yen(settlement.cashAmount ?? 0);
  if (remaining < 0) throw new Error('精算額に不整合があります。保存を中止しました。');
  return remaining;
}
export interface SettlementItem extends SettlementRef {
  eventId: string; eventName: string; label: string;
  companionId: string; direction: 'pay' | 'receive';
  total?: number; remaining?: number; fingerprint: string;
  directionWarning?: boolean; settlement: TicketSettlement; eligible: boolean; deadline?: string;
}
export function settlementItems(tickets: Ticket[], events: Event[]): SettlementItem[] {
  return tickets.flatMap(ticket => ticket.receptions.flatMap(reception => reception.applications.flatMap((application, index) => {
    const payment = application.fulfillment?.payment;
    if (!payment) return [];
    return payment.settlements.map(settlement => {
      const event = events.find(e => e.id === ticket.eventId);
      const total = settlementAmount(reception, application, settlement);
      const remaining = remainingAmount(total, settlement);
      return { ticketId: ticket.id, receptionId: reception.id, applicationId: application.id, settlementId: settlement.id,
        eventId: ticket.eventId, eventName: event?.title ?? '削除済みイベント',
        label: `${reception.name}／${reception.seatTypes.find(s => s.id === application.seatTypeId)?.name || `申込 ${index + 1}`} (${settlement.direction === 'pay' ? '支払' : '受取'})`,
        companionId: settlement.companionId, direction: settlement.direction, total, remaining, settlement, directionWarning: needsDirectionReview(application,settlement),
        deadline: payment.deadlineDate,
        eligible: !!event && !!settlement.companionId && settlement.companionId !== 'self' && !settlement.isSettled && application.status === 'won' && payment.settlementRequired !== false && Number.isSafeInteger(remaining) && remaining! > 0,
        fingerprint: JSON.stringify([settlement, total, payment.payerId, application.companionIds, application.fulfillment?.seatAssignments, application.status, payment.settlementRequired, payment.deadlineDate, event?.id]),
      };
    });
  })));
}
export function offsetCandidates(source: SettlementItem, items: SettlementItem[]) {
  return items.filter(item => item.eligible && item.companionId === source.companionId && item.direction !== source.direction && settlementKey(item) !== settlementKey(source));
}
export function calculateOffset(source: SettlementItem, targets: SettlementItem[]) {
  if (!source.eligible || !targets.length) throw new Error('相殺する未精算項目を選んでください。');
  if (new Set(targets.map(settlementKey)).size !== targets.length || targets.some(t => !offsetCandidates(source, [t]).length)) throw new Error('同じ同行者の、反対方向の未精算項目だけを選択できます。');
  const sourceAmount = yen(source.remaining);
  const targetAmount = targets.reduce((sum, t) => yen(sum + yen(t.remaining)), 0);
  const offsetAmount = Math.min(sourceAmount, targetAmount);
  const remainingAmount = Math.abs(sourceAmount - targetAmount);
  return { sourceAmount, targetAmount, offsetAmount, remainingAmount,
    remainingDirection: remainingAmount === 0 ? undefined : sourceAmount > targetAmount ? source.direction : targets[0].direction };
}
function date(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('正しい日付を入力してください。');
}
export interface OffsetRequest {
  source: SettlementItem; targets: SettlementItem[]; offsetDate: string; cashDate?: string; settleRemainder: boolean;
}
function freshItem(expected: SettlementItem, items: SettlementItem[]) {
  const matches = items.filter(i => settlementKey(i) === settlementKey(expected));
  if (matches.length !== 1 || matches[0].fingerprint !== expected.fingerprint) throw new Error('精算状態が変更されています。最新の内容を読み直してから、もう一度確認してください。');
  return matches[0];
}
export function replaceSettlement(tickets: Ticket[], ref: SettlementRef, next: TicketSettlement): Ticket[] {
  return tickets.map(t => t.id !== ref.ticketId ? t : { ...t, receptions: t.receptions.map(r => r.id !== ref.receptionId ? r : { ...r,
    applications: r.applications.map(a => a.id !== ref.applicationId || !a.fulfillment ? a : { ...a, fulfillment: { ...a.fulfillment,
      payment: { ...a.fulfillment.payment, settlements: a.fulfillment.payment.settlements.map(s => s.id === ref.settlementId ? next : s) } } }) }) });
}
export function applyOffset(tickets: Ticket[], events: Event[], request: OffsetRequest, id: string, createdAt: string): { tickets: Ticket[]; history: SettlementOffset } {
  if (tickets.some(t => t.offsetHistory?.some(h => h.id === id))) throw new Error('この相殺はすでに保存されています。');
  const items = settlementItems(tickets, events);
  const source = freshItem(request.source, items);
  const targets = request.targets.map(t => freshItem(t, items)).sort((a, b) => settlementKey(a).localeCompare(settlementKey(b)));
  const calculation = calculateOffset(source, targets);
  date(request.offsetDate);
  if (request.settleRemainder && calculation.remainingAmount > 0) date(request.cashDate);
  let available = calculation.offsetAmount;
  const allocations: OffsetAllocation[] = [source, ...targets].map((item, index) => {
    const before = yen(item.remaining);
    const offset = index === 0 ? calculation.offsetAmount : Math.min(available, before);
    if (index !== 0) available -= offset;
    const cash = request.settleRemainder ? before - offset : 0;
    const remaining = before - offset - cash;
    const { ticketId, receptionId, applicationId, settlementId, eventId, eventName, label, direction } = item;
    return { ticketId, receptionId, applicationId, settlementId, eventId, eventName, label, direction, before, offset, cash, remaining };
  });
  let next = tickets;
  for (const allocation of allocations) {
    const item = [source, ...targets].find(i => settlementKey(i) === settlementKey(allocation))!;
    allocation.beforeSettlement = structuredClone(item.settlement);
    const updated: TicketSettlement = { ...item.settlement, amount: yen(item.total), amountMode: 'manual',
      offsetAmount: yen(item.settlement.offsetAmount ?? 0) + allocation.offset,
      cashAmount: yen(item.settlement.cashAmount ?? 0) + allocation.cash,
      isSettled: allocation.remaining === 0,
      settledDate: allocation.cash > 0 ? request.cashDate : item.settlement.settledDate,
      offsetCompletedDate: allocation.remaining === 0 && allocation.cash === 0 ? request.offsetDate : undefined,
    };
    allocation.afterSettlement = structuredClone(updated);
    next = replaceSettlement(next, item, updated);
  }
  const history: SettlementOffset = { id, offsetDate: request.offsetDate, companionId: source.companionId,
    source: { ticketId: source.ticketId, receptionId: source.receptionId, applicationId: source.applicationId, settlementId: source.settlementId },
    ...calculation, cashDate: request.settleRemainder && calculation.remainingAmount > 0 ? request.cashDate : undefined,
    completedDate: calculation.remainingAmount === 0 ? request.offsetDate : request.settleRemainder ? request.cashDate : undefined,
    status: calculation.remainingAmount === 0 ? 'offset' : request.settleRemainder ? 'settled' : 'pending', createdAt, allocations };
  next = next.map(t => t.id === source.ticketId ? { ...t, offsetHistory: [...(t.offsetHistory ?? []), history] } : t);
  return { tickets: refreshOffsetHistory(next, events), history };
}
/** Complete the outstanding balance, retaining the original amount and netting ledger. */
export function applySettlementCash(tickets: Ticket[], events: Event[], expected: SettlementItem, cashDate: string): Ticket[] {
  date(cashDate);
  const item = freshItem(expected, settlementItems(tickets, events));
  if (!hasOffset(item.settlement)) {
    return replaceSettlement(tickets, item, { ...item.settlement, amount: yen(item.total), isSettled: true, settledDate: cashDate });
  }
  if (!item.eligible) throw new Error('この項目は精算済みです。相殺履歴を確認してください。');
  return refreshOffsetHistory(replaceSettlement(tickets, item, { ...item.settlement, cashAmount: yen(item.settlement.cashAmount ?? 0) + yen(item.remaining), isSettled: true, settledDate: cashDate, offsetCompletedDate: undefined }), events);
}
/** Keep each historical remainder's settlement status/date up to date, without rewriting its allocations. */
export function refreshOffsetHistory(tickets: Ticket[], events: Event[]): Ticket[] {
  const items = settlementItems(tickets, events);
  return tickets.map(ticket => !ticket.offsetHistory ? ticket : { ...ticket, offsetHistory: ticket.offsetHistory.map(history => {
    if (history.status === 'cancelled') return history;
    const outstanding = history.allocations.filter(a => a.remaining > 0).map(a => items.find(i => settlementKey(i) === settlementKey(a)));
    if (!outstanding.length) return history;
    const complete = outstanding.every(i => i?.settlement.isSettled);
    const cashDate = outstanding.filter(i => i && (i.settlement.cashAmount ?? 0) > 0).map(i => i!.settlement.settledDate ?? '').sort().at(-1) || history.cashDate;
    return { ...history, cashDate, completedDate: complete ? cashDate ?? history.completedDate ?? history.offsetDate : undefined, status: complete ? cashDate ? 'settled' as const : 'offset' as const : 'pending' as const };
  }) });
}
/** Other editors may change tags, but must never erase or rewrite recorded netting. */
export function assertOffsetPreserved(previous: Ticket[], next: Ticket[]) {
  for (const ticket of previous) {
    const updated = next.find(t => t.id === ticket.id);
    if (JSON.stringify(ticket.offsetHistory ?? []) !== JSON.stringify(updated?.offsetHistory ?? [])) throw new Error('相殺履歴のあるチケットは削除・上書きできません。支払いタスクの詳細を確認してください。');
    for (const reception of ticket.receptions) for (const application of reception.applications) for (const s of application.fulfillment?.payment.settlements ?? []) {
      if (!hasOffset(s)) continue;
      const a = updated?.receptions.find(r => r.id === reception.id)?.applications.find(a => a.id === application.id);
      const n = a?.fulfillment?.payment.settlements.find(n => n.id === s.id);
      const fields = (v: TicketSettlement) => [v.companionId, v.direction, v.amount, v.amountMode, v.offsetAmount, v.cashAmount, v.isSettled, v.settledDate, v.offsetCompletedDate];
      if (!n || JSON.stringify(fields(s)) !== JSON.stringify(fields(n)) || a?.status !== application.status || a?.fulfillment?.payment.settlementRequired !== application.fulfillment?.payment.settlementRequired) throw new Error('相殺後の精算が変更されています。残額の支払いは支払いタスクから記録してください。');
    }
  }
}
