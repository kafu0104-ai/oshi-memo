import { isLottery } from "./ticketReception";
import { selectedTags } from "./taskTags";
import { loadTickets, loadEvents, loadCompanions } from "./storage";
import { settlementAmount } from "./ticketAmounts";
export interface TicketTask {
  href?: string; schedule?: boolean; receive?: boolean; companionId?: string; members?: TicketTask[];
  ticketId: string; receptionId: string; applicationId: string; taskId: string;
  eventId: string; eventName: string; receptionName: string; title: string;
  person: string; amount?: number; completed: boolean; date?: string; dateLabel: string;
  tagIds: string[]; settlementId?: string; important?: boolean; deadline?: string;
}
export const taskUrl = (task: TicketTask) => task.href ?? `/tasks/${task.ticketId}/${task.receptionId}/${task.applicationId}/${task.taskId}`;
export function loadTicketTasks(): TicketTask[] {
  const events = loadEvents(); const companions = loadCompanions();
  const person = (id?: string) => id === "self" ? "自分" : companions.find(c => c.id === id)?.name ?? "未登録の同行者";
  return loadTickets().flatMap(ticket => {
    const event = events.find(e => e.id === ticket.eventId); if (!event) return [];
    return ticket.receptions.flatMap(reception => reception.applications.flatMap(application => {
      const payment = application.fulfillment?.payment;
      const common = { ticketId: ticket.id, receptionId: reception.id, applicationId: application.id, eventId: event.id, eventName: event.title, receptionName: reception.name };
      const tasks: TicketTask[] = [];
      const lottery = isLottery(reception);
      const today = localToday();
      const awaitingPurchase = application.status === "notApplied" || (!lottery && application.status === "applied");
      const deadline = awaitingPurchase ? reception.applicationDeadlineDate : lottery && application.status === "applied" ? reception.resultDate : undefined;
      const available = awaitingPurchase ? !reception.applicationStartDate || reception.applicationStartDate <= today : !!deadline && deadline <= today;
      if (reception.receptionType !== "admission" && deadline && available) tasks.push({ ...common, taskId: "schedule", schedule: true,
        href: `/events/${event.id}/tickets/${reception.id}/edit#${application.id}`,
        title: awaitingPurchase ? lottery ? "チケットを申し込む" : "チケットを購入する" : "当落結果を確認する",
        person: "自分", completed: false, deadline, dateLabel: "日程", tagIds: selectedTags({}, awaitingPurchase ? lottery ? "application" : "payment" : "result") });
      if (!payment) return tasks;

      if (payment.payerId && (payment.isPaid || (application.status === "won" && payment.method !== "creditCard"))) {
        const seat = reception.seatTypes.find(s => s.id === application.seatTypeId) ?? (reception.seatTypes.length === 1 ? reception.seatTypes[0] : undefined);
        tasks.push({ ...common, taskId: "payment", tagIds: selectedTags(payment,payment.payerId && payment.payerId !== "self" ? "settlement" : "payment"), important: selectedTags(payment,payment.payerId && payment.payerId !== "self" ? "settlement" : "payment").includes("important"), deadline: payment.deadlineDate, title: payment.payerId === "self" ? "チケット代を支払う" : `${person(payment.payerId)}さんへチケット代の支払い`, person: person(payment.payerId), amount: seat ? seat.price * application.quantity + reception.fees.reduce((sum,f) => sum + f.amount * (f.unit === "perTicket" ? application.quantity : 1),0) : undefined, completed: payment.isPaid, date: payment.paidDate, dateLabel: "支払日" });
      }
      for (const settlement of payment.settlements) {
        if (payment.settlementRequired === false && !settlement.isSettled) continue;
        if (application.status !== "won" && !settlement.isSettled) continue;
        tasks.push({ ...common, receive: settlement.direction === "receive", companionId: settlement.companionId, taskId: settlement.id, settlementId: settlement.id, tagIds: selectedTags(settlement,"settlement"), important: selectedTags(settlement,"settlement").includes("important"), title: settlement.direction === "pay" ? `${person(settlement.companionId)}さんへチケット代の支払い` : `${person(settlement.companionId)}さんからチケット代を受け取る`, person: person(settlement.companionId), amount: settlementAmount(reception,application,settlement), completed: settlement.isSettled, date: settlement.settledDate, dateLabel: settlement.direction === "pay" ? "支払日" : "受領日" });
      }
      return tasks;
    }));
  });
}

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
export function sortTasks(tasks: TicketTask[], today = localToday()): TicketTask[] {
  const rank = (t: TicketTask) => t.deadline && t.deadline < today ? 0 : t.important ? 1 : 2;
  return [...tasks].sort((a,b) => rank(a)-rank(b) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || taskUrl(a).localeCompare(taskUrl(b)));
}

export function groupReceiptTasks(tasks:TicketTask[]):TicketTask[]{
 const groups=new Map<string,TicketTask[]>();
 for(const task of tasks)if(task.receive){const list=groups.get(task.eventId)||[];list.push(task);groups.set(task.eventId,list);}
 return [...tasks.filter(t=>!t.receive),...Array.from(groups.values()).map(members=>{
  const pending=members.filter(t=>!t.completed);
  const count=new Set(pending.map(t=>t.companionId||t.person)).size;
  const counted=pending.length?pending:members;
  return {...members[0],href:`/tasks/receipts/${members[0].eventId}`,title:`チケット代の受け取り${count?`（あと${count}人）`:''}`,completed:pending.length===0,amount:counted.some(t=>t.amount===undefined)?undefined:counted.reduce((sum,t)=>sum+(t.amount||0),0),tagIds:[...new Set(members.flatMap(t=>t.tagIds))],important:pending.some(t=>t.important),members,date:pending.length?undefined:members.map(t=>t.date||'').sort().at(-1)};
 })];
}
