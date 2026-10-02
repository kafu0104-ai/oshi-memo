const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function setup(){
 const data=new Map();let fail=false,count=0;
 const localStorage={getItem:k=>data.get(k)??null,setItem(k,v){if(fail&&k==='oshi-memo-tickets'){fail=false;throw Error('quota');}data.set(k,v);},removeItem:k=>data.delete(k)};
 const modules={};const load=name=>{if(modules[name])return modules[name];const exports={};modules[name]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/services/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,localStorage,require:p=>p==='./id'?{generateId:()=>`id-${++count}`}:load(p.replace('./',''))});return exports;};
 return {storage:load('storage'),draft:load('eventTicketDraft'),data,fail:()=>fail=true};
}
const event={id:'event',title:'パーク',mainGenreId:'exhibition',entryPeriods:[{id:'round',method:'事前予約・購入',entries:[]}]};
function edits(api){const r=api.draft.entryTicketDraft(event.entryPeriods[0],undefined,()=>Math.random().toString());r.name='パーク';r.seatTypes=[{id:'adult',name:'大人',price:3500,hasBenefit:true}];r.fees=[{id:'fee',name:'手数料',amount:100,unit:'perTicket'}];const a=r.applications[0];a.quantity=2;a.seatTypeId='adult';a.status='won';a.companionIds=['friend'];a.fulfillment.payment={payerId:'self',method:'payPay',isPaid:true,settlements:[{id:'settlement',companionId:'friend',direction:'receive',amount:0,amountMode:'auto',isSettled:false}]};return {eventId:event.id,receptions:[r],companions:[{id:'friend',name:'友人'}]};}
test('イベント登録一回で料金・特典・手数料・支払い・同行者と精算を保存し再保存で重複しない',()=>{
 const api=setup(),changes=edits(api);api.storage.saveEvents([event],changes);
 const first=api.storage.loadTickets()[0].receptions[0];assert.equal(first.seatTypes[0].price,3500);assert.equal(first.seatTypes[0].hasBenefit,true);assert.equal(first.fees[0].amount,100);assert.equal(first.applications[0].fulfillment.payment.method,'payPay');assert.equal(first.applications[0].fulfillment.payment.settlements[0].companionId,'friend');assert.equal(api.storage.loadCompanions().length,1);
 api.storage.saveEvents([event],changes);assert.equal(api.storage.loadTickets()[0].receptions.length,1);assert.equal(api.storage.loadTickets()[0].receptions[0].id,first.id);assert.equal(api.storage.loadCompanions().length,1);
});
test('編集時は既存の受領済み・発券情報を引き継ぎ、イベント名だけの保存でも保持',()=>{
 const api=setup(),changes=edits(api);changes.receptions[0].applications[0].fulfillment.issuance.isIssued=true;changes.receptions[0].applications[0].fulfillment.payment.settlements[0].isSettled=true;
 api.storage.saveEvents([event],changes);const r=api.storage.loadTickets()[0].receptions[0],draft=api.draft.entryTicketDraft(event.entryPeriods[0],r,()=>{throw Error('unexpected id');});assert.equal(draft.applications[0].fulfillment.issuance.isIssued,true);
 api.storage.saveEvents([{...event,title:'変更'}]);assert.equal(api.storage.loadTickets()[0].receptions[0].applications[0].fulfillment.payment.settlements[0].isSettled,true);
});
test('チケット保存失敗時はイベントと新規同行者も元に戻す',()=>{
 const api=setup();api.storage.saveEvents([{...event,entryPeriods:[]}]);const before=JSON.stringify([...api.data]);api.fail();assert.throws(()=>api.storage.saveEvents([event],edits(api)),/quota/);assert.equal(JSON.stringify([...api.data]),before);
});
test('抽選を共通フォームへ移しても当選・枚数・結果日時を引き継ぐ',()=>{
 const api=setup();const p={...event.entryPeriods[0],method:'抽選',ticketPrice:9800,ticketQuantity:2,ticketStatus:'won',resultDate:'2026-10-02',resultTime:'18:00'};
 const r=api.draft.entryTicketDraft(p,undefined,()=>Math.random().toString());assert.equal(r.receptionType,'lottery');assert.equal(r.resultDate,'2026-10-02');assert.equal(r.resultTime,'18:00');assert.equal(r.applications[0].status,'won');assert.equal(r.applications[0].quantity,2);assert.equal(r.applications[0].fulfillment.payment.isPaid,false);assert.equal(api.draft.supportsInlineTicket('抽選'),true);
});
test('登録時の支払者名の編集は同じIDを更新し既存の精算先を維持',()=>{
 const api=setup(),changes=edits(api);api.storage.saveEvents([event],changes);
 const edited={...changes,companions:[{...changes.companions[0],name:'変更後の名前'}]};api.storage.saveEvents([event],edited);
 assert.equal(api.storage.loadCompanions().length,1);assert.equal(api.storage.loadCompanions()[0].name,'変更後の名前');assert.equal(api.storage.loadTickets()[0].receptions[0].applications[0].fulfillment.payment.settlements[0].companionId,'friend');
});
