import type { Event } from '../types/Event';
import type { Ticket } from '../types/Ticket';
import type { ExchangeRecord } from './exchanges';
export interface CalendarLabel {id:string;name:string;color:string;description:string}
export interface CalendarSettings {labels:CalendarLabel[]; assignments:Record<string,string>;weight:400|500|700}
export const CALENDAR_KEY='oshi-memo-calendar';
export const defaultCalendar:CalendarSettings={labels:[{id:'event',name:'イベント',color:'#e8b9c8',description:'参加予定・公演日'},{id:'deadline',name:'申込・支払い',color:'#efc18d',description:'申込締切・支払期限'},{id:'result',name:'当落発表',color:'#b6cbe9',description:'抽選の結果発表日'},{id:'exchange',name:'交換・譲渡',color:'#b7d5bf',description:'発送・手渡し予定'}],assignments:{},weight:400};
export function loadCalendar():CalendarSettings {
 const raw=localStorage.getItem(CALENDAR_KEY);if(!raw)return structuredClone(defaultCalendar);
 const data=JSON.parse(raw)?.[0];
 if(!data||!Array.isArray(data.labels)||!data.assignments||![400,500,700].includes(data.weight)||data.labels.some((l:CalendarLabel)=>!l.id||typeof l.name!=='string'||typeof l.description!=='string'||!/^#[\da-f]{6}$/i.test(l.color)))throw new Error('カレンダー設定を読み込めませんでした。');
 return data;
}
export function saveCalendar(data:CalendarSettings){localStorage.setItem(CALENDAR_KEY,JSON.stringify([data]));}
export function textOnColor(hex:string){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#000000':'#ffffff';
}
export interface CalendarPlan {id:string;date:string;time:string;title:string;kind:string;href:string}
export function calendarPlans(events:Event[],tickets:Ticket[],exchanges:ExchangeRecord[]):CalendarPlan[]{
 const plans:CalendarPlan[]=[];
 const add=(id:string,date:string|undefined,title:string,kind:string,href:string,time='')=>{if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))plans.push({id,date,title,kind,href,time});};
 for(const e of events){
  const href=`/events/${e.id}`;
  const visits=new Map<string,{date:string;time:string;title:string}>();
  const visit=(date:string,time='',title='参加予定')=>{if(date)visits.set(`${date}-${time}`,{date,time,title});};
  if(e.attendanceDate)visit(e.attendanceDate,e.attendanceTime);
  else for(const p of e.performances||[])visit(p.date,p.schedule?.[0]?.time||'',p.name||'公演');
  for(const p of e.entryPeriods||[]){
   for(const v of p.entries)if(p.method!=='抽選'||v.result==='当選')visit(v.date,v.time);
   if(p.method==='抽選'&&!tickets.some(t=>t.eventId===e.id&&t.receptions.some(r=>r.sourceEntryPeriodId===p.id))){
    add(`${e.id}:${p.id}:deadline`,p.applicationEnd?.slice(0,10),`${e.title}／申込締切`,'deadline',href,p.applicationEnd?.slice(11)||'');
    add(`${e.id}:${p.id}:result`,p.resultDate,`${e.title}／当落発表`,'result',href,p.resultTime);
    add(`${e.id}:${p.id}:payment`,p.paymentDeadline,`${e.title}／支払期限`,'deadline',href);
   }
  }
  if(visits.size)for(const [key,v] of visits)add(`${e.id}:visit:${key}`,v.date,`${e.title}／${v.title}`,'event',href,v.time);
  else {add(`${e.id}:start`,e.startDate,`${e.title}／開催初日`,'event',href);if(e.endDate!==e.startDate)add(`${e.id}:end`,e.endDate,`${e.title}／最終日`,'event',href);}
 }
 for(const t of tickets){const e=events.find(e=>e.id===t.eventId);if(!e)continue;
  for(const r of t.receptions){const base=`${t.id}:${r.id}`,title=`${e.title}／${r.name}`,href=`/events/${e.id}/tickets/${r.id}/edit`;
   add(`${base}:deadline`,r.applicationDeadlineDate,`${title}／申込・購入締切`,'deadline',href,r.applicationDeadlineTime);
   if((r.receptionType??'lottery')==='lottery')add(`${base}:result`,r.resultDate,`${title}／当落発表`,'result',href,r.resultTime);
   const dates=new Set<string>();
   for(const a of r.applications){const payment=a.fulfillment?.payment;if(payment?.deadlineDate&&!payment.isPaid&&!dates.has(payment.deadlineDate)){dates.add(payment.deadlineDate);add(`${base}:payment:${payment.deadlineDate}`,payment.deadlineDate,`${title}／支払期限`,'deadline',href,payment.deadlineTime);}}
  }
 }
 for(const x of exchanges)if(x.stage!=='cancelled'&&x.stage!=='completed')add(`exchange:${x.id}`,x.deadline,`${x.partner}さん／${x.method==='hand'?'手渡し':'発送・対応予定'}`,'exchange',`/exchange?edit=${x.id}`,x.time);
 return plans.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.title.localeCompare(b.title));
}
