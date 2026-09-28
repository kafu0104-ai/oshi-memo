import { loadExchanges, exchangeSteps, exchangeKinds } from './exchanges';
import { loadEvents } from './storage';
import type { TicketTask } from './ticketTasks';
export function loadExchangeTasks():TicketTask[] {
  let records;try{records=loadExchanges();}catch{return [];}
  const events=loadEvents();
  return records.filter(r=>r.stage==='active'||r.stage==='completed').flatMap(record=>exchangeSteps(record).map(step=>({
    ticketId:record.id,receptionId:'exchange',applicationId:record.id,taskId:step.id,
    href:`/exchange?edit=${encodeURIComponent(record.id)}`,schedule:step.id!=='money',eventId:record.eventId,
    eventName:events.find(e=>e.id===record.eventId)?.title||exchangeKinds[record.kind],receptionName:'',
    title:`${record.partner}さん：${step.label}`,person:record.partner,
    amount:record.amount!==''?Number(record.amount):undefined,completed:!!record.done[step.id],dateLabel:'確認',
    tagIds:[step.tag],deadline:record.deadline||undefined,
  })));
}
