import type { TicketApplication } from '../types/Ticket';
export function withCompanionSettlements(app:TicketApplication,id:()=>string):TicketApplication{
 const f=app.fulfillment;if(f?.payment.payerId!=='self')return app;
 const settlements=[...f.payment.settlements];
 for(const companionId of app.companionIds)if(!settlements.some(s=>s.direction==='receive'&&s.companionId===companionId))settlements.push({id:id(),companionId,direction:'receive',amount:0,amountMode:'auto',isSettled:false,tagIds:['income']});
 return {...app,fulfillment:{...f,payment:{...f.payment,settlementRequired:true,settlements}}};
}
