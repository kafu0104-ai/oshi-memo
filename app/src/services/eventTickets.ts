import type { Event } from '../types/Event';
import type { Ticket, TicketReception } from '../types/Ticket';

const genres=['live','stage','talk','exhibition','collaboration-food','movie'];
/** Update only changed event fields; preserve ticket-side edits and payment records. */
export function mergeEventTickets(events:Event[], previous:Event[], tickets:Ticket[], id:()=>string):Ticket[] {
  const next=tickets.map(t=>({...t,receptions:[...t.receptions]}));
  for(const event of events){
    if(!genres.includes(event.mainGenreId||event.tagIds?.[0]||''))continue;
    for(const period of event.entryPeriods||[]){
      if(!['抽選','先着・予約','予約','当日購入','事前予約・購入','先着（売切れ次第終了）'].includes(period.method))continue;
      const old=previous.find(e=>e.id===event.id)?.entryPeriods?.find(p=>p.id===period.id);
      // Unchanged rounds do not recreate tickets explicitly removed by the user.
      if(old&&JSON.stringify(old)===JSON.stringify(period))continue;
      let ticket=next.find(t=>t.eventId===event.id);
      if(!ticket){ticket={id:id(),eventId:event.id,receptions:[]};next.push(ticket);}
      const existing=ticket.receptions.find(r=>r.sourceEntryPeriodId===period.id);
      const reception:TicketReception=existing?{...existing}:{
        id:id(),sourceEntryPeriodId:period.id,name:period.name||event.title,
        seatTypes:[],fees:[],applications:[{id:id(),quantity:1,companionIds:[],status:'notApplied'}]
      };
      if(!existing||old?.name!==period.name)reception.name=period.name||event.title;
      if(!existing||old?.method!==period.method)reception.receptionType=period.method==='抽選'?'lottery':period.method==='当日購入'?'admission':'general';
      for(const [source,date,time] of [['applicationStart','applicationStartDate','applicationStartTime'],['applicationEnd','applicationDeadlineDate','applicationDeadlineTime']] as const){
        if(!existing||old?.[source]!==period[source]){
          const parts=(period[source]||'').split('T');
          reception[date]=parts[0]||undefined;reception[time]=parts[1]||undefined;
        }
      }
      for(const key of ['resultDate','resultTime'] as const)if(!existing||old?.[key]!==period[key])reception[key]=period[key]||undefined;
      if(!existing||old?.paymentDeadline!==period.paymentDeadline){
        reception.applications=reception.applications.map(a=>{
          const fulfillment=a.fulfillment||{payment:{isPaid:false,settlements:[]},issuance:{isIssued:false},distributions:[],seatAssignments:[]};
          return {...a,fulfillment:{...fulfillment,payment:{...fulfillment.payment,deadlineDate:period.paymentDeadline||undefined}}};
        });
      }
      // Inline entry fields only update the simple linked application, preserving detailed records.
      if(reception.applications.length===1 && reception.seatTypes.length<=1){
        let app={...reception.applications[0]};
        if(period.ticketPrice!==undefined && (!existing || old?.ticketPrice!==period.ticketPrice)){
          const seatId=reception.seatTypes[0]?.id||id();
          reception.seatTypes=[{...reception.seatTypes[0],id:seatId,name:reception.seatTypes[0]?.name||'チケット',price:period.ticketPrice}];
          app.seatTypeId=seatId;
        }
        if(period.ticketQuantity!==undefined && (!existing || old?.ticketQuantity!==period.ticketQuantity))app.quantity=period.ticketQuantity;
        if(period.ticketStatus!==undefined && period.method==='抽選' && (!existing || old?.ticketStatus!==period.ticketStatus))app.status=period.ticketStatus;
        if(period.ticketPurchased!==undefined && period.method!=='抽選' && (!existing || old?.ticketPurchased!==period.ticketPurchased))app.status=period.ticketPurchased?'won':'notApplied';
        const f=app.fulfillment||{payment:{isPaid:false,settlements:[]},issuance:{isIssued:false},distributions:[],seatAssignments:[]};
        app.fulfillment={...f,payment:{...f.payment}};
        if(!existing || old?.ticketPayerId!==period.ticketPayerId)app.fulfillment.payment.payerId=period.ticketPayerId||'self';
        if(period.ticketPurchased!==undefined && period.method!=='抽選' && (!existing || existing.applications[0].status!==(period.ticketPurchased?'won':'notApplied')))app.fulfillment.payment.isPaid=period.ticketPurchased;
        reception.applications=[app];
      }
      ticket.receptions=existing?ticket.receptions.map(r=>r.id===existing.id?reception:r):[...ticket.receptions,reception];
    }
  }
  return next;
}
