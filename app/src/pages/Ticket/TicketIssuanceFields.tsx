import { useLocation } from "react-router";
import type { EventPerformance } from '../../types/Event';
import type { TicketReception, TicketIssuance } from '../../types/Ticket';
import { localToday } from '../../services/ticketTasks';
export default function TicketIssuanceFields({reception,performances,onChange}:{reception:TicketReception;performances:EventPerformance[];onChange:(value:TicketReception)=>void}) {
 const {hash} = useLocation();
 if (!reception.applications.length) return null;
 return <section className="ticket-options"><h3>発券</h3><p>開始日時になると、当選・購入済みのチケットがやることに表示されます。</p>
 {reception.applications.map((app,index)=>{
  const value=app.fulfillment?.issuance ?? {isIssued:false};
  const update=(issuance:TicketIssuance)=>onChange({...reception,applications:reception.applications.map(a=>a.id!==app.id?a:{...a,fulfillment:{...(a.fulfillment??{payment:{isPaid:false,settlements:[]},distributions:[],seatAssignments:[]}),issuance}})});
  const performance=performances.find(p=>p.id===app.performanceId);
  return <details key={app.id} id={`issuance-${app.id}`} className="ticket-issuance-entry" open={hash === `#issuance-${app.id}` ? true : undefined}>
   <summary>{reception.seatTypes.find(s=>s.id===app.seatTypeId)?.name || `チケット ${index+1}`}{performance ? `・${performance.date} ${performance.name||''}` : ''} {value.isIssued?'（発券済み）':''}</summary>
   <div className="ticket-schedule">
   {([['発券開始','availableFromDate','availableFromTime'],['発券期限','deadlineDate','deadlineTime']] as const).map(([label,date,time])=><fieldset className="ticket-date" key={date}><legend>{label}</legend><div className="ticket-form-row"><label className="form-field">日付<input type="date" aria-label={`${label}日 ${index+1}`} value={value[date]||''} onChange={e=>update({...value,[date]:e.target.value||undefined})}/></label><label className="form-field">時刻<input type="time" aria-label={`${label}時刻 ${index+1}`} value={value[time]||''} onChange={e=>update({...value,[time]:e.target.value||undefined})}/></label></div></fieldset>)}
   <label className="ticket-check"><input type="checkbox" checked={value.isIssued} onChange={e=>update({...value,isIssued:e.target.checked,issuedDate:e.target.checked?(value.issuedDate||localToday()):undefined})}/>発券済み</label>
   {value.isIssued && <label className="form-field">発券日<input type="date" value={value.issuedDate||''} onChange={e=>update({...value,issuedDate:e.target.value||undefined})}/></label>}
   </div>
  </details>;
 })}</section>;
}
