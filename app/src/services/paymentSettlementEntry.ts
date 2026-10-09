import type { Ticket } from '../types/Ticket';
import { ticketShare } from './ticketAmounts';
import { yen } from './settlementOffsets';

export interface PaymentRef { ticketId: string; receptionId: string; applicationId: string }
export function paymentSettlementEntry(tickets: Ticket[], ref: PaymentRef) {
  const ticket = tickets.find(t => t.id === ref.ticketId);
  const reception = ticket?.receptions.find(r => r.id === ref.receptionId);
  const application = reception?.applications.find(a => a.id === ref.applicationId);
  const payment = application?.fulfillment?.payment;
  if (!ticket || !reception || !application || !payment) return undefined;
  const direction = payment.payerId === 'self' ? 'receive' as const : 'pay' as const;
  const companionIds = payment.payerId === 'self' ? application.companionIds : payment.payerId ? [payment.payerId] : [];
  return { payment, application, direction,
    companionIds: [...new Set(companionIds)].filter(id => id && id !== 'self'),
    amount: ticketShare(reception, application),
    fingerprint: JSON.stringify([ticket.eventId, reception.seatTypes, reception.fees, application]),
  };
}
/** The user's registration action reuses the standard one-ticket share and never marks the purchase paid. */
export function registerPaymentSettlement(tickets: Ticket[], ref: PaymentRef, companionId: string, fingerprint: string, id: string) {
  const entry = paymentSettlementEntry(tickets, ref);
  if (!entry) throw new Error('支払い情報が見つかりません。画面を読み直してください。');
  if (!entry.companionIds.includes(companionId)) throw new Error('支払者・同行者が変更されています。画面を読み直してください。');
  const existing = entry.payment.settlements.filter(s => s.companionId === companionId && s.direction === entry.direction);
  // A second click or another tab must never create a second debt.
  if (!existing.length && entry.payment.settlements.some(s=>s.companionId===companionId&&!s.isSettled)) throw new Error('同じ相手の別方向の精算があります。チケット情報で精算方向を確認してください。');
  if (existing.length) return { tickets, settlementId: existing[0].id };
  if (entry.fingerprint !== fingerprint) throw new Error('金額や申込内容が変更されています。画面を読み直して確認してください。');
  if (entry.application.status !== 'won') throw new Error('購入・当選状況をチケット情報で確認してください。');
  const amount = yen(entry.amount);
  if (amount === 0) throw new Error('相殺する精算金額をチケット情報に登録してください。');
  const settlement = { id, companionId, direction: entry.direction, amount, amountMode: 'auto' as const, isSettled: false, tagIds: ['settlement'] };
  const next = tickets.map(t => t.id !== ref.ticketId ? t : { ...t, receptions: t.receptions.map(r => r.id !== ref.receptionId ? r : { ...r,
    applications: r.applications.map(a => a.id !== ref.applicationId || !a.fulfillment ? a : { ...a, fulfillment: { ...a.fulfillment,
      payment: { ...a.fulfillment.payment, settlementRequired: true, settlements: [...a.fulfillment.payment.settlements, settlement] } } }) }) });
  return { tickets: next, settlementId: id };
}
