import type { TicketReception, TicketApplication, TicketSettlement } from "../types/Ticket";
/** One ticket's share; any fractional yen stays with the original payer. */
export function ticketShare(reception: TicketReception, application: TicketApplication): number | undefined {
  const seat = application.seatTypeId ? reception.seatTypes.find(s => s.id === application.seatTypeId)
    : reception.seatTypes.length === 1 ? reception.seatTypes[0] : undefined;
  if (!seat || !Number.isFinite(seat.price) || application.quantity < 1) return undefined;
  const perTicket = reception.fees.filter(f => f.unit === "perTicket").reduce((n, f) => n + f.amount, 0);
  const perApplication = reception.fees.filter(f => f.unit === "perApplication").reduce((n, f) => n + f.amount, 0);
  const value = seat.price + perTicket + Math.floor(perApplication / application.quantity);
  return Number.isFinite(value) ? value : undefined;
}
export function settlementAmount(reception: TicketReception, application: TicketApplication, settlement: TicketSettlement): number | undefined {
  // Old zero amounts were placeholders, not entered prices. Preserve completed records.
  return !settlement.isSettled && (settlement.amountMode === "auto" || (settlement.amountMode === undefined && settlement.amount === 0))
    ? ticketShare(reception, application) : settlement.amount;
}
