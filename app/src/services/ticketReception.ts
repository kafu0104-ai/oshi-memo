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
    .filter(seat => !reception.omittedApplicationSeatIds?.includes(seat.id))
    .filter(seat => !applications.some(application => application.seatTypeId === seat.id))
    .map(seat => ({ id: createId(), seatTypeId: seat.id, quantity: 1,
      companionIds: [], status: "notApplied" as const }))] };
}

export function removeReceptionApplication(reception: TicketReception, id: string): TicketReception {
  const removed = reception.applications.find(a=>a.id===id);
  const seatId=removed?.seatTypeId ?? (removed && reception.seatTypes.length===1 ? reception.seatTypes[0].id : undefined);
  return {...reception, applications:reception.applications.filter(a=>a.id!==id), omittedApplicationSeatIds:seatId ? [...new Set([...(reception.omittedApplicationSeatIds??[]),seatId])] : reception.omittedApplicationSeatIds};
}

/** Empty automatically generated applications must not lock a newly added seat. */
export function canRemoveSeat(reception: TicketReception, seatId: string): boolean {
  return reception.applications.filter(a=>a.seatTypeId===seatId).every(a=>
    a.status === "notApplied" && !a.performanceId && !a.applicationNumber && !a.memo &&
    !a.preferenceRank && a.companionIds.length===0 && !a.fulfillment);
}
export function removeUnusedSeat(reception: TicketReception, seatId: string): TicketReception {
  if (!canRemoveSeat(reception,seatId)) return reception;
  return {...reception, seatTypes:reception.seatTypes.filter(s=>s.id!==seatId),
    applications:reception.applications.filter(a=>a.seatTypeId!==seatId),
    omittedApplicationSeatIds:reception.omittedApplicationSeatIds?.filter(id=>id!==seatId)};
}
