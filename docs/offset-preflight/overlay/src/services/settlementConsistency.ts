import type { TicketApplication, TicketSettlement } from '../types/Ticket';
const hasOffset = (s: TicketSettlement) => s.offsetAmount !== undefined;
export function directionContext(app: TicketApplication, settlement: TicketSettlement) {
  return JSON.stringify([app.fulfillment?.payment.payerId, [...app.companionIds].sort(), settlement.companionId, settlement.direction]);
}
export function expectedDirection(app: TicketApplication, settlement: TicketSettlement) {
  const payer = app.fulfillment?.payment.payerId;
  if (payer === 'self' && app.companionIds.includes(settlement.companionId)) return 'receive' as const;
  if (payer && payer !== 'self' && payer === settlement.companionId) return 'pay' as const;
  return undefined;
}
export function needsDirectionReview(app: TicketApplication, s: TicketSettlement) {
  const expected = expectedDirection(app, s);
  return (!expected || expected !== s.direction) && s.directionReviewedContext !== directionContext(app, s);
}
/** Explicit user choice only; preserve amounts, identities and completed history. */
export function reviewSettlementDirection(app: TicketApplication, id: string, choice: 'keep' | 'correct', at: string): TicketApplication {
  const payment = app.fulfillment?.payment;
  const s = payment?.settlements.find(s => s.id === id);
  if (!payment || !s || !app.fulfillment) throw new Error('精算が見つかりません。');
  if (s.isSettled || hasOffset(s)) throw new Error('精算済み・相殺済みの記録は変更できません。');
  const expected = expectedDirection(app, s);
  if (choice === 'correct' && !expected) throw new Error('精算方向を判断できません。支払者と同行者を確認してください。');
  if (choice === 'correct' && payment.settlements.some(other => other.id !== id && other.companionId === s.companionId && other.direction === expected && !other.isSettled)) throw new Error('同じ相手・方向の未精算が既にあります。重複する記録を確認してください。');
  const next = {...s, direction: choice === 'correct' ? expected! : s.direction};
  next.directionReviewedContext = directionContext(app, next);
  next.directionReviews = [...(s.directionReviews ?? []), {at, before: s.direction, after: next.direction, payerId: payment.payerId}];
  return {...app, fulfillment: {...app.fulfillment, payment: {...payment, settlements: payment.settlements.map(s => s.id === id ? next : s)}}};
}
