const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const api=require('../src/services/settlementOffsets.ts');
const storage=require('../src/services/storage.ts');
const {loadTicketTasks,groupReceiptTasks}=require('../src/services/ticketTasks.ts');
const {captureSnapshot,restoreSnapshot}=require('../src/services/personalSnapshot.ts');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MemoryRouter}=require('react-router');
const Form=require('../src/pages/Home/SettlementTaskForm.tsx').default;
let records, failWrite, writes, queue;
beforeEach(()=>{
 records=new Map();failWrite=false;writes=0;queue=Promise.resolve();
 global.localStorage={getItem:k=>records.get(k)??null,setItem(k,v){if(failWrite&&k==='oshi-memo-tickets')throw Error('quota');writes++;records.set(k,v)},removeItem:k=>records.delete(k),get length(){return records.size},key:i=>[...records.keys()][i]??null};
 Object.defineProperty(global,'navigator',{configurable:true,value:{locks:{request(_name,_options,operation){const next=queue.then(operation);queue=next.catch(()=>{});return next}}}});
});
function fixture(amounts=[12000,8500],directions=['receive','pay'],people=[]){
 const events=amounts.map((_,i)=>({id:`e${i}`,title:`イベント${i}`}));
 const tickets=amounts.map((amount,i)=>({id:`t${i}`,eventId:`e${i}`,receptions:[{id:`r${i}`,name:`受付${i}`,seatTypes:[{id:'seat',name:'指定席',price:amount}],fees:[],applications:[{id:`a${i}`,quantity:1,seatTypeId:'seat',status:'won',companionIds:['friend'],fulfillment:{payment:{payerId:'self',isPaid:true,deadlineDate:'2026-10-01',settlements:[{id:`s${i}`,companionId:people[i]??'friend',direction:directions[i]??'pay',amount,amountMode:'manual',isSettled:false}]},issuance:{isIssued:false},distributions:[],seatAssignments:[]}}]}]}));
 records.set('oshi-memo-events',JSON.stringify(events));records.set('oshi-memo-tickets',JSON.stringify(tickets));records.set('oshi-memo-companions',JSON.stringify([{id:'friend',name:'友人'}]));
 return {tickets,events};
}
const items=f=>api.settlementItems(f.tickets,f.events);
function request(f,extra={}){const [source,...targets]=items(f);return {source,targets,offsetDate:'2026-10-08',settleRemainder:false,...extra}}
function apply(f,extra={},id='offset-1'){return api.applyOffset(f.tickets,f.events,request(f,extra),id,'2026-10-08T10:00:00Z');}
const save=(req,id='offset-1')=>storage.transactTicketSettlements((tickets,events)=>{const result=api.applyOffset(tickets,events,req,id,'2026-10-08T10:00:00Z');return {tickets:result.tickets,result:result.history}},true);
test('通常支払いは従来の金額・完了日を保存し購入側を変えない',async()=>{
 const f=fixture();const before=structuredClone(f.tickets[0].receptions[0].applications[0].fulfillment.payment);
 await storage.transactTicketSettlements((tickets,events)=>({tickets:api.applySettlementCash(tickets,events,items(f)[0],'2026-10-09'),result:null}));
 const after=items({tickets:storage.loadTickets(),events:f.events})[0];assert.equal(after.settlement.isSettled,true);assert.equal(after.settlement.settledDate,'2026-10-09');assert.equal(after.total,12000);assert.equal(after.remaining,0);assert.equal(after.settlement.offsetAmount,undefined);assert.equal(storage.loadTickets()[0].receptions[0].applications[0].fulfillment.payment.isPaid,before.isPaid);
});
test('2イベント 12000受取−8500支払＝3500受取、相殺は現金扱いにしない',()=>{
 const f=fixture(),r=apply(f),[a,b]=items({...f,tickets:r.tickets});
 assert.equal(r.history.offsetAmount,8500);assert.equal(r.history.remainingAmount,3500);assert.equal(r.history.remainingDirection,'receive');assert.equal(a.remaining,3500);assert.equal(b.remaining,0);assert.equal(a.settlement.isSettled,false);assert.equal(b.settlement.isSettled,true);assert.equal(b.settlement.settledDate,undefined);assert.equal(b.settlement.offsetCompletedDate,'2026-10-08');assert.equal(b.settlement.cashAmount,0);
});
test('対象超過 8000受取−12000支払＝4000支払',()=>{const f=fixture([8000,12000]),r=apply(f);assert.equal(r.history.remainingDirection,'pay');assert.equal(r.history.remainingAmount,4000);assert.deepEqual(items({...f,tickets:r.tickets}).map(i=>i.remaining),[0,4000]);});
test('支払いを相殺元にしても差額の向きが正しい',()=>{for(const [a,b,d] of [[12000,8500,'pay'],[8000,12000,'receive']]){const r=apply(fixture([a,b],['pay','receive']));assert.equal(r.history.remainingDirection,d);}});
test('3イベント以上を選択、各明細に整数で配賦する',()=>{const f=fixture([12000,5000,8500,1000]),r=apply(f);assert.equal(r.history.targetAmount,14500);assert.equal(r.history.offsetAmount,12000);assert.equal(r.history.remainingAmount,2500);assert.equal(items({...f,tickets:r.tickets}).reduce((sum,i)=>sum+i.remaining,0),2500);assert.equal(r.history.allocations.slice(1).reduce((s,a)=>s+a.offset,0),12000);});
test('同一イベントの複数項目を個別に選べる',()=>{const f=fixture([8000,3000,4000]);f.tickets[2].eventId='e1';const r=api.applyOffset(f.tickets,f.events,request(f,{targets:[items(f)[2]]}),'offset-1','now');assert.equal(r.history.targetAmount,4000);assert.equal(items({...f,tickets:r.tickets})[1].remaining,3000);});
test('差額ゼロでは現金日付なしで双方を完了する',()=>{for(const combined of [false,true]){const f=fixture([8000,8000]),r=apply(f,{settleRemainder:combined});assert.equal(r.history.cashDate,undefined);assert.equal(r.history.status,'offset');assert.equal(r.history.remainingDirection,undefined);assert.ok(items({...f,tickets:r.tickets}).every(i=>i.settlement.isSettled&&i.settlement.cashAmount===0));}});
test('相殺＋差額精算は日付を分けて保存し全額完了',()=>{const f=fixture(),r=apply(f,{settleRemainder:true,cashDate:'2026-10-10'});assert.equal(r.history.offsetDate,'2026-10-08');assert.equal(r.history.cashDate,'2026-10-10');assert.equal(r.history.status,'settled');const [a,b]=items({...f,tickets:r.tickets});assert.equal(a.settlement.cashAmount,3500);assert.equal(a.settlement.settledDate,'2026-10-10');assert.equal(b.settlement.cashAmount,0);assert.ok(a.settlement.isSettled&&b.settlement.isSettled);});
test('対象超過の差額精算でも対象側だけに現金を配賦',()=>{const f=fixture([8000,5000,7000]),r=apply(f,{settleRemainder:true,cashDate:'2026-10-10'});assert.equal(r.history.remainingDirection,'pay');assert.equal(r.history.allocations[0].cash,0);assert.equal(r.history.allocations.slice(1).reduce((s,a)=>s+a.cash,0),4000);assert.ok(items({...f,tickets:r.tickets}).every(i=>i.remaining===0));});
test('差額があるときだけ正しい支払日を要求',()=>{assert.throws(()=>apply(fixture(),{settleRemainder:true}),/日付/);assert.throws(()=>apply(fixture(),{offsetDate:'2026-02-30'}),/日付/);assert.throws(()=>apply(fixture(),{settleRemainder:true,cashDate:'2026-02-30'}),/日付/);});
test('一部相殺した残額を通常支払いで再精算、元金額を保持',()=>{const f=fixture(),r=apply(f);const interim={...f,tickets:r.tickets};const next=api.applySettlementCash(r.tickets,f.events,items(interim)[0],'2026-10-11');const s=items({...f,tickets:next})[0];assert.equal(s.total,12000);assert.equal(s.settlement.offsetAmount,8500);assert.equal(s.settlement.cashAmount,3500);assert.equal(s.remaining,0);});
test('一部相殺した残額をさらに別イベントと相殺できる',()=>{const f=fixture([12000,8500,3500]);const r=api.applyOffset(f.tickets,f.events,request(f,{targets:[items(f)[1]]}),'one','now');const next={...f,tickets:r.tickets},i=items(next);const r2=api.applyOffset(next.tickets,next.events,{source:i[0],targets:[i[2]],offsetDate:'2026-10-09',settleRemainder:false},'two','later');assert.equal(items({...f,tickets:r2.tickets})[0].remaining,0);assert.equal(r2.tickets[0].offsetHistory.length,2);});
test('候補は同じ同行者・反対方向・未精算だけ',()=>{const f=fixture([12000,8500,1000,2000],['receive','pay','receive','pay'],['friend','friend','friend','other']);const i=items(f);assert.deepEqual(api.offsetCandidates(i[0],i).map(x=>x.settlementId),['s1']);assert.throws(()=>apply(f),/同行者/);});
test('精算済み・不明金額・購入前・精算不要は候補から除外',()=>{const f=fixture([12000,8500,1000,2000,3000]);f.tickets[1].receptions[0].applications[0].fulfillment.payment.settlements[0].isSettled=true;f.tickets[2].receptions[0].applications[0].status='notApplied';f.tickets[3].receptions[0].applications[0].fulfillment.payment.settlementRequired=false;f.tickets[4].receptions[0].applications[0].fulfillment.payment.settlements[0].amount=0.5;const i=items(f);assert.equal(api.offsetCandidates(i[0],i).length,0);});
test('同じ明細の二重選択と相殺元自身を拒否',()=>{const f=fixture(),i=items(f);for(const targets of [[i[1],i[1]],[i[0]]])assert.throws(()=>apply(f,{targets}),/同行者/);});
test('候補の合計が安全な整数を超える場合は保存しない',()=>{const f=fixture([100,Number.MAX_SAFE_INTEGER,1]);assert.throws(()=>apply(f),/整数/);});
test('計算前の不正な負残額を拒否',()=>{const f=fixture();const s=f.tickets[0].receptions[0].applications[0].fulfillment.payment.settlements[0];s.offsetAmount=13000;assert.throws(()=>items(f),/不整合/);});
test('確定前に他の画面で状態が変わったら保存しない',async()=>{const f=fixture(),req=request(f);f.tickets[1].receptions[0].applications[0].fulfillment.payment.settlements[0].isSettled=true;await storage.saveTickets(f.tickets);await assert.rejects(()=>save(req),/変更/);assert.equal(storage.loadTickets()[0].offsetHistory,undefined);});
test('同時の二重確定はロック内で再検証して一方だけ成功',async()=>{const f=fixture(),req=request(f);const result=await Promise.allSettled([save(req,'one'),save(req,'two')]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(storage.loadTickets()[0].offsetHistory.length,1);assert.equal(items({tickets:storage.loadTickets(),events:f.events})[0].remaining,3500);});
test('片側更新・履歴欠落を起こさず、容量不足では保存前のまま',async()=>{const f=fixture(),before=records.get('oshi-memo-tickets');failWrite=true;await assert.rejects(()=>save(request(f)),/quota/);assert.equal(records.get('oshi-memo-tickets'),before);assert.equal(writes,0);failWrite=false;await save(request(f));assert.equal(writes,1);});
test('再読み込み・バックアップ復元でも残額と履歴が一致',async()=>{const f=fixture();await save(request(f));const captured=captureSnapshot();records.clear();restoreSnapshot(captured);const next=storage.loadTickets();assert.equal(next[0].offsetHistory[0].offsetAmount,8500);assert.equal(items({...f,tickets:next})[0].remaining,3500);});
test('双方のToDoを更新、部分相殺の残額は既存IDで表示',async()=>{const f=fixture();const old=loadTicketTasks();await save(request(f));const tasks=loadTicketTasks();assert.equal(tasks.length,old.length);const a=tasks.find(t=>t.settlementId==='s0'),b=tasks.find(t=>t.settlementId==='s1');assert.equal(a.amount,3500);assert.equal(a.completed,false);assert.equal(b.completed,true);assert.equal(b.dateLabel,'相殺完了日');assert.equal(b.date,'2026-10-08');assert.equal(groupReceiptTasks(tasks).find(t=>t.receive).amount,3500);assert.equal(storage.loadTickets()[0].receptions[0].applications[0].fulfillment.payment.deadlineDate,'2026-10-01');});
test('相殺＋差額精算で双方のToDoが完了',async()=>{const f=fixture();await save(request(f,{settleRemainder:true,cashDate:'2026-10-12'}));assert.ok(loadTicketTasks().filter(t=>t.settlementId).every(t=>t.completed));});
test('通常編集や古い画面からの保存で相殺・履歴を破壊できない',async()=>{const f=fixture();await save(request(f));await assert.rejects(()=>storage.saveTicket(f.tickets[0]),/相殺/);const next=storage.loadTickets();next[1].receptions[0].applications[0].fulfillment.payment.settlements=[];await assert.rejects(()=>storage.saveTickets(next),/相殺/);const tags=storage.loadTickets();tags[0].receptions[0].applications[0].fulfillment.payment.settlements[0].tagIds=['important'];await storage.saveTickets(tags);});
test('相殺履歴を消すイベント削除を防止',async()=>{const f=fixture();await save(request(f));await assert.rejects(()=>storage.saveEvents([f.events[1]]),/相殺履歴/);assert.equal(storage.loadEvents().length,2);});
test('ロック非対応時に相殺を不安全な方法へフォールバックしない',async()=>{const f=fixture();Object.defineProperty(global,'navigator',{configurable:true,value:{}});await assert.rejects(()=>save(request(f)),/ブラウザ/);assert.equal(writes,0);await storage.saveTicket(f.tickets[0]);});
test('既存のタスク詳細に通常支払い・相殺の選択と履歴が表示される',async()=>{const f=fixture();const render=()=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Form,{task:loadTicketTasks().find(t=>t.settlementId==='s0'),onSaved:()=>{}})));let html=render();assert.match(html,/通常支払い/);assert.match(html,/他のイベントと相殺/);assert.match(html,/checked="" value="normal"/);await save(request(f));html=render();assert.match(html,/相殺履歴/);assert.match(html,/8,500円/);assert.match(html,/3,500円/);assert.match(html,/イベント1/);});
test('後日の残額支払いで履歴の精算状態・差額精算日も更新',async()=>{const f=fixture();await save(request(f));const expected=items({...f,tickets:storage.loadTickets()})[0];await storage.transactTicketSettlements((tickets,events)=>({tickets:api.applySettlementCash(tickets,events,expected,'2026-10-15'),result:null}),true);const h=storage.loadTickets()[0].offsetHistory[0];assert.equal(h.status,'settled');assert.equal(h.cashDate,'2026-10-15');assert.equal(h.allocations[0].remaining,3500);assert.equal(h.allocations[0].cash,0);});
test('別の相殺で残額を完了した場合は金銭授受日に偽装しない',()=>{const f=fixture([12000,8500,3500]);const first=api.applyOffset(f.tickets,f.events,request(f,{targets:[items(f)[1]]}),'one','now');const i=items({...f,tickets:first.tickets});const second=api.applyOffset(first.tickets,f.events,{source:i[0],targets:[i[2]],offsetDate:'2026-10-10',settleRemainder:false},'two','later');assert.equal(second.tickets[0].offsetHistory[0].status,'offset');assert.equal(second.tickets[0].offsetHistory[0].cashDate,undefined);});
const entryApi=require('../src/services/paymentSettlementEntry.ts');
const Entry=require('../src/pages/Home/PaymentOffsetEntry.tsx').default;
const purchaseRef={ticketId:'t0',receptionId:'r0',applicationId:'a0',eventId:'e0'};
test('購入の支払い画面からイベント選択へ進み、相手側イベントを表示',()=>{
 fixture();const render=open=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Entry,{task:purchaseRef,open,onOpenChange:()=>{},onSaved:()=>{}})));
 assert.match(render(false),/他のイベントと相殺/);const html=render(true);assert.match(html,/イベント1/);assert.match(html,/checked="" value="offset"/);assert.match(html,/8,500/);assert.equal(writes,0);
});
test('未登録の同行者精算は登録案内を表示し、購入の支払いを変えない',()=>{
 const f=fixture();const p=f.tickets[0].receptions[0].applications[0].fulfillment.payment;p.payerId='friend';p.isPaid=false;p.settlements=[];
 records.set('oshi-memo-tickets',JSON.stringify(f.tickets));
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Entry,{task:purchaseRef,open:true,onOpenChange:()=>{},onSaved:()=>{}})));
 assert.match(html,/この精算を登録してイベントを選ぶ/);assert.equal(writes,0);
 const entry=entryApi.paymentSettlementEntry(f.tickets,purchaseRef);const result=entryApi.registerPaymentSettlement(f.tickets,purchaseRef,'friend',entry.fingerprint,'new');
 const after=result.tickets[0].receptions[0].applications[0].fulfillment.payment;assert.equal(after.isPaid,false);assert.equal(after.deadlineDate,p.deadlineDate);assert.equal(after.settlements[0].direction,'pay');assert.equal(after.settlements[0].amount,12000);assert.deepEqual(p.settlements,[]);
 const duplicate=entryApi.registerPaymentSettlement(result.tickets,purchaseRef,'friend',entry.fingerprint,'duplicate');assert.equal(duplicate.settlementId,'new');assert.equal(duplicate.tickets[0].receptions[0].applications[0].fulfillment.payment.settlements.length,1);
});
test('同行者精算の追加時に金額変更と別同行者を拒否',()=>{
 const f=fixture();f.tickets[0].receptions[0].applications[0].fulfillment.payment.settlements=[];const entry=entryApi.paymentSettlementEntry(f.tickets,purchaseRef);
 assert.throws(()=>entryApi.registerPaymentSettlement(f.tickets,purchaseRef,'other',entry.fingerprint,'new'),/同行者/);
 f.tickets[0].receptions[0].seatTypes[0].price=20000;assert.throws(()=>entryApi.registerPaymentSettlement(f.tickets,purchaseRef,'friend',entry.fingerprint,'new'),/変更/);
});
test('同じ方向の精算には除外理由と確認先を表示し、相殺候補にしない',()=>{
 fixture([2000,8500],['pay','pay']);
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Form,{task:loadTicketTasks().find(t=>t.settlementId==='s0'),onSaved:()=>{},initialMode:'offset'})));
 assert.match(html,/同じ方向のため相殺できない精算/);
 assert.match(html,/イベント1/);
 assert.match(html,/どちらも自分から支払う/);
 assert.match(html,/\/events\/e1\/tickets\/r1\/edit#a1/);
 assert.doesNotMatch(html,/class="settlement-event"/);
 assert.equal(writes,0);
});
const consistency=require('../src/services/settlementConsistency.ts');
const {withCompanionSettlements}=require('../src/services/companionSettlements.ts');
test('支払者変更時は逆方向の精算を重複追加せず確認後のみ訂正',()=>{
 const f=fixture([2275],['pay']);const app=f.tickets[0].receptions[0].applications[0],s=app.fulfillment.payment.settlements[0];
 assert.equal(withCompanionSettlements(app,()=> 'new').fulfillment.payment.settlements.length,1);
 assert.equal(consistency.needsDirectionReview(app,s),true);
 const kept=consistency.reviewSettlementDirection(app,s.id,'keep','now');assert.equal(consistency.needsDirectionReview(kept,kept.fulfillment.payment.settlements[0]),false);
 const corrected=consistency.reviewSettlementDirection(app,s.id,'correct','now').fulfillment.payment.settlements[0];assert.equal(corrected.direction,'receive');assert.equal(corrected.amount,2275);assert.equal(s.direction,'pay');
 for(const patch of [{isSettled:true},{offsetAmount:0}]){Object.assign(s,patch);assert.throws(()=>consistency.reviewSettlementDirection(app,s.id,'correct','now'),/変更できません/);}
});
const groupsApi=require('../src/services/offsetGroups.ts');
test('MAPPA 2275受取と文スト4045支払を1グループにし1770支払後双方完了',()=>{
 const f=fixture([2275,4045]);const r=apply(f);const group=groupsApi.offsetGroups(r.tickets,f.events)[0];
 assert.equal(group.remaining,1770);assert.equal(group.direction,'pay');assert.equal(group.items.length,2);
 const done=groupsApi.completeOffsetGroup(r.tickets,f.events,group,'2026-10-09');const final=groupsApi.offsetGroups(done,f.events)[0];
 assert.equal(final.completed,true);assert.equal(final.completedDate,'2026-10-09');assert.ok(items({...f,tickets:done}).every(i=>i.settlement.isSettled));
 assert.throws(()=>groupsApi.completeOffsetGroup(done,f.events,group,'2026-10-09'),/変更/);
 assert.throws(()=>groupsApi.cancelOffsetGroup(done,f.events,final,'now'),/完了/);
});
test('相殺取り消しで元の記録を復元し、履歴・IDは削除しない',()=>{
 const f=fixture([2275,4045]);const r=apply(f);const group=groupsApi.offsetGroups(r.tickets,f.events)[0];
 const cancelled=groupsApi.cancelOffsetGroup(r.tickets,f.events,group,'2026-10-09T00:00:00Z');
 assert.deepEqual(cancelled.map(t=>t.receptions),f.tickets.map(t=>t.receptions));assert.equal(cancelled[0].offsetHistory[0].id,'offset-1');assert.equal(cancelled[0].offsetHistory[0].status,'cancelled');
 assert.throws(()=>groupsApi.cancelOffsetGroup(cancelled,f.events,group,'now'),/変更/);
 const req={...request(f),source:items({...f,tickets:cancelled})[0],targets:[items({...f,tickets:cancelled})[1]]};
 const next=api.applyOffset(cancelled,f.events,req,'offset-2','2026-10-10T00:00:00Z');assert.equal(next.tickets[0].offsetHistory[0].status,'cancelled');
});
test('複数対象に残る差額を一括精算し、別の精算は巻き込まない',()=>{
 const f=fixture([2275,3000,2000,999]);const r=apply(f,{targets:items(f).slice(1,3)});const g=groupsApi.offsetGroups(r.tickets,f.events)[0];assert.equal(g.remaining,2725);
 const next=groupsApi.completeOffsetGroup(r.tickets,f.events,g,'2026-10-09');assert.deepEqual(items({...f,tickets:next}).map(i=>i.remaining),[0,0,0,999]);
});
test('一部相殺残高を再相殺した履歴は同じ残高グループとなり取り消せる',()=>{
 const f=fixture([10000,3000,2000]);const r=apply(f,{targets:[items(f)[1]]});const i=items({...f,tickets:r.tickets});
 const r2=api.applyOffset(r.tickets,f.events,{source:i[0],targets:[i[2]],offsetDate:'2026-10-09',settleRemainder:false},'second','2026-10-09T00:00:00Z');
 const g=groupsApi.offsetGroups(r2.tickets,f.events)[0];assert.equal(g.id,'offset-1');assert.equal(g.remaining,5000);assert.equal(g.histories.length,2);
 const next=groupsApi.cancelOffsetGroup(r2.tickets,f.events,g,'2026-10-10T00:00:00Z');assert.deepEqual(next.map(t=>t.receptions),f.tickets.map(t=>t.receptions));
});
const {groupOffsetTasks}=require('../src/services/offsetTaskDisplay.ts');
const {CompletedTasksPage}=require('../src/pages/Home/TicketTaskPage.tsx');
const {GroupDetails}=require('../src/pages/Home/OffsetGroupPage.tsx');
test('ホームは相殺精算だけ1件にまとめ、完了後はグループ単位でアーカイブ',async()=>{
 const f=fixture([2275,4045,999]);await save(request(f,{targets:[items(f)[1]]}));
 let tasks=groupOffsetTasks(loadTicketTasks());const g=tasks.find(t=>t.offsetGroupId);assert.equal(g.amount,1770);assert.equal(g.completed,false);assert.match(g.title,/支払う/);assert.equal(tasks.filter(t=>t.settlementId).length,1);assert.equal(tasks.find(t=>t.settlementId==='s2').amount,999);
 const group=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];await storage.transactTicketSettlements((tickets,events)=>({tickets:groupsApi.completeOffsetGroup(tickets,events,group,'2026-10-09'),result:null}),true);
 tasks=groupOffsetTasks(loadTicketTasks());assert.equal(tasks.find(t=>t.offsetGroupId).completed,true);assert.equal(tasks.find(t=>t.settlementId==='s2').completed,false);
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(CompletedTasksPage)));assert.match(html,/相殺済み/);assert.match(html,/1,770円支払済み/);assert.match(html,/offset-1/);
});
test('差額受取・ゼロのアーカイブと旧履歴に互換性がある',()=>{
 for(const amounts of [[4045,2275],[2275,2275]]){
  const f=fixture(amounts);const r=apply(f);for(const h of r.tickets[0].offsetHistory){delete h.completedDate;for(const a of h.allocations){delete a.beforeSettlement;delete a.afterSettlement;}}
  records.set('oshi-memo-tickets',JSON.stringify(r.tickets));const group=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];
  assert.equal(group.remaining,amounts[0]-amounts[1]);assert.equal(group.completed,amounts[0]===amounts[1]);
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(GroupDetails,{id:group.id})));assert.match(html,/関連する精算/);assert.match(html,/相殺履歴/);
  if(!group.completed){const undo=groupsApi.cancelOffsetGroup(r.tickets,f.events,group,'now');assert.deepEqual(items({...f,tickets:undo}).map(i=>i.remaining),amounts);}
 }
});
test('クラウド同期と同じsnapshot形式を往復してグループID・残額・履歴が保持される',async()=>{
 const f=fixture([2275,4045]);await save(request(f));const before=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];
 const transferred=JSON.parse(JSON.stringify(captureSnapshot()));records.clear();restoreSnapshot(transferred);
 const after=groupsApi.offsetGroups(storage.loadTickets(),storage.loadEvents())[0];assert.equal(after.id,before.id);assert.equal(after.fingerprint,before.fingerprint);assert.equal(groupOffsetTasks(loadTicketTasks()).find(t=>t.offsetGroupId).amount,1770);
});
test('グループ完了・取消の保存失敗は両側と履歴を変更しない',async()=>{
 const f=fixture([2275,4045]);await save(request(f));const before=records.get('oshi-memo-tickets');const group=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];failWrite=true;
 for(const operation of [groupsApi.completeOffsetGroup,groupsApi.cancelOffsetGroup])await assert.rejects(()=>storage.transactTicketSettlements((tickets,events)=>({tickets:operation(tickets,events,group,'2026-10-09'),result:null}),true),/quota/);
 assert.equal(records.get('oshi-memo-tickets'),before);
});
test('金銭授受後のグループ取消と他タブの古い内容での操作を拒否',()=>{
 const f=fixture([2275,4045,2000]);const r=apply(f);let next=api.applySettlementCash(r.tickets,f.events,items({...f,tickets:r.tickets})[1],'2026-10-09');
 const group=groupsApi.offsetGroups(next,f.events)[0];assert.throws(()=>groupsApi.cancelOffsetGroup(next,f.events,group,'now'),/変更|金銭/);
 const old=groupsApi.offsetGroups(r.tickets,f.events)[0];assert.throws(()=>groupsApi.completeOffsetGroup(next,f.events,old,'2026-10-09'),/変更/);
});
test('グループ完了と取り消しの同時確定は一方だけ成功する',async()=>{
 const f=fixture([2275,4045]);await save(request(f));const group=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];
 const results=await Promise.allSettled([groupsApi.completeOffsetGroup,groupsApi.cancelOffsetGroup].map(operation=>storage.transactTicketSettlements((tickets,events)=>({tickets:operation(tickets,events,group,'2026-10-09'),result:null}),true)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const g=groupsApi.offsetGroups(storage.loadTickets(),f.events)[0];assert.equal(g.completed,true);assert.ok(items({...f,tickets:storage.loadTickets()}).every(i=>i.remaining===0));
});
test('相殺後の料金変更がある場合、自動金額の復元による残高変更を拒否',()=>{
 const f=fixture([2275,4045]);f.tickets[0].receptions[0].applications[0].fulfillment.payment.settlements[0].amountMode='auto';const r=apply(f);
 r.tickets[0].receptions[0].seatTypes[0].price=3000;
 const g=groupsApi.offsetGroups(r.tickets,f.events)[0];assert.throws(()=>groupsApi.cancelOffsetGroup(r.tickets,f.events,g,'now'),/料金が変更/);
});
test('支払者不明や同行者から外れた精算は推測訂正せず維持の確認ができる',()=>{
 const f=fixture();const app=f.tickets[0].receptions[0].applications[0];app.companionIds=[];const s=app.fulfillment.payment.settlements[0];
 assert.equal(consistency.needsDirectionReview(app,s),true);assert.throws(()=>consistency.reviewSettlementDirection(app,s.id,'correct','now'),/判断できません/);
 const next=consistency.reviewSettlementDirection(app,s.id,'keep','now');assert.equal(next.fulfillment.payment.settlements[0].direction,s.direction);
});
