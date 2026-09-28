import type { TicketReception } from "../types/Ticket";
export const isLottery = (reception: TicketReception) => (reception.receptionType ?? "lottery") === "lottery";
export function receptionDates(reception: TicketReception) {
  if (reception.receptionType === "admission") return [];
  return isLottery(reception) ? [
    ["販売開始", "applicationStartDate", "applicationStartTime"],
    ["販売終了", "applicationDeadlineDate", "applicationDeadlineTime"],
    ["抽選結果発表", "resultDate", "resultTime"],
  ] as const : [
    ["販売開始", "applicationStartDate", "applicationStartTime"],
    ["購入期限", "applicationDeadlineDate", "applicationDeadlineTime"],
  ] as const;
}
// Keep existing status values so saved tickets and payment records remain compatible.
export function receptionStatuses(reception: TicketReception) {
  return isLottery(reception)
    ? { notApplied: "未申込", applied: "申込済み・結果待ち", won: "当選・購入確定", lost: "落選" }
    : { notApplied: "未購入", applied: "予約済み・購入手続き中", won: "購入済み", lost: "購入見送り" };
}

/** Create independent result records without replacing existing applications or payments. */
export function withLotteryEntries(reception: TicketReception, createId: () => string): TicketReception {
  if (reception.receptionType === "general") return reception;
  const applications = reception.applications.map(application =>
    !application.seatTypeId && reception.seatTypes.length === 1
      ? { ...application, seatTypeId: reception.seatTypes[0].id } : application);
  return { ...reception, applications: [...applications, ...reception.seatTypes
    .filter(seat => !applications.some(application => application.seatTypeId === seat.id))
    .map(seat => ({ id: createId(), seatTypeId: seat.id, quantity: 1,
      companionIds: [], status: "notApplied" as const }))] };
}
