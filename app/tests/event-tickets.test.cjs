const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/eventTickets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
let counter=0;const id=()=>String(++counter);
const period={id:'round',method:'抽選',applicationStart:'2026-10-01T12:00',applicationEnd:'2026-10-05T18:00',resultDate:'2026-10-10',paymentDeadline:'2026-10-12',entries:[]};
const event={id:'event',title:'ライブ',mainGenreId:'live',entryPeriods:[period]};
test('全6ジャンルから申込日程と支払期限を引き継ぐ',()=>{
 for(const mainGenreId of ['live','stage','talk','exhibition','collaboration-food','movie']){
  const [ticket]=api.mergeEventTickets([{...event,mainGenreId}],[],[],id);const r=ticket.receptions[0];
  assert.equal(r.applicationStartTime,'12:00');assert.equal(r.resultDate,'2026-10-10');
  assert.equal(r.applications[0].fulfillment.payment.deadlineDate,'2026-10-12');
 }
});
test('再保存で重複せず、チケット側の編集・支払済みを保持する',()=>{
 let tickets=api.mergeEventTickets([event],[],[],id);
 tickets[0].receptions[0].name='チケット側で変更';
 tickets[0].receptions[0].applications[0].fulfillment.payment.isPaid=true;
 const updated={...event,entryPeriods:[{...period,applicationEnd:'2026-10-06T18:00'}]};
 tickets=api.mergeEventTickets([updated],[event],tickets,id);
 assert.equal(tickets.length,1);assert.equal(tickets[0].receptions.length,1);
 assert.equal(tickets[0].receptions[0].name,'チケット側で変更');
 assert.equal(tickets[0].receptions[0].applicationDeadlineDate,'2026-10-06');
 assert.equal(tickets[0].receptions[0].applications[0].fulfillment.payment.isPaid,true);
 assert.equal(api.mergeEventTickets([updated],[updated],[],id).length,0);
});
test('未定・不要では作らず、追加の抽選回は別受付になる',()=>{
 assert.equal(api.mergeEventTickets([{...event,entryPeriods:[{...period,method:''}]}],[],[],id).length,0);
 assert.equal(api.mergeEventTickets([{...event,entryPeriods:[{...period,method:'チケット不要'}]}],[],[],id).length,0);
 const tickets=api.mergeEventTickets([{...event,entryPeriods:[period,{...period,id:'round2'}]}],[],[],id);
 assert.equal(tickets[0].receptions.length,2);
});
