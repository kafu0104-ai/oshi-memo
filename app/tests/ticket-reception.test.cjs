const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load(file,deps={}) {const context={exports:{},require:name=>{if(!(name in deps))throw Error(name);return deps[name]},Date};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);return context.exports;}
const helpers=load('src/services/ticketReception.ts');
function tasks(type,status,fulfillment) {
 const reception={id:'r',name:'受付',receptionType:type,resultDate:'2000-01-01',applicationDeadlineDate:'2099-01-01',seatTypes:[{id:'s',price:2000}],fees:[],applications:[{id:'a',status,quantity:1,seatTypeId:'s',companionIds:[],fulfillment}]};
 return load('src/services/ticketTasks.ts',{'./ticketReception':helpers,'./taskTags':{selectedTags:()=>[]},'./ticketAmounts':{settlementAmount:()=>1000},'./storage':{loadEvents:()=>[{id:'e',title:'展示'}],loadCompanions:()=>[],loadTickets:()=>[{id:'t',eventId:'e',receptions:[reception]}]}}).loadTicketTasks();
}
test('legacy receptions remain lottery; general dates never include result',()=>{
 assert.equal(helpers.isLottery({}),true);
 assert.equal(helpers.receptionDates({}).length,3);
 assert.equal(helpers.receptionDates({receptionType:'general'}).some(row=>row[1]==='resultDate'),false);
 assert.equal(helpers.receptionStatuses({receptionType:'general'}).won,'購入確定');
});
test('general purchase reminders ignore old lottery result dates',()=>{
 assert.equal(tasks('general','applied')[0].title,'チケットを購入する');
 assert.equal(tasks('general','won').length,0);
 assert.equal(tasks(undefined,'applied')[0].title,'当落結果を確認する');
 assert.equal(tasks('lottery','notApplied')[0].title,'チケットを申し込む');
});
test('confirmed general purchases retain payment tasks and amounts',()=>{
 const fulfillment={payment:{payerId:'self',isPaid:false,settlements:[]}};
 const result=tasks('general','won',fulfillment);
 assert.equal(result.length,1);assert.equal(result[0].taskId,'payment');assert.equal(result[0].amount,2000);
 assert.equal(tasks('general','lost',fulfillment).length,0);
});

test('admission tickets have purchase status and no lottery reminders',()=>{
 assert.equal(helpers.isLottery({receptionType:'admission'}),false);
 assert.equal(helpers.receptionDates({receptionType:'admission'}).some(row=>row[1]==='resultDate'),false);
 assert.equal(helpers.receptionStatuses({receptionType:'admission'}).won,'購入確定');
 assert.equal(tasks('admission','applied').length,0);
 assert.equal(helpers.receptionDates({receptionType:'admission'}).length,0);
 assert.equal(tasks('admission','won').length,0);
});
test('lottery creates one independent record per ticket type and keeps saved results',()=>{
 let n=0;const id=()=>`new-${++n}`;
 const initial={seatTypes:[{id:'s',name:'S席',price:5000},{id:'a',name:'A席',price:3000}],applications:[]};
 const created=helpers.withLotteryEntries(initial,id);
 assert.equal(created.applications.length,2);
 assert.equal(created.applications[0].seatTypeId,'s');
 assert.equal(created.applications[1].seatTypeId,'a');
 created.applications[0].status='won';created.applications[1].status='lost';
 created.applications[0].fulfillment={payment:{method:'payPay',isPaid:true,settlements:[]}};
 const saved=helpers.withLotteryEntries(created,id);
 assert.equal(saved.applications.length,2);
 assert.equal(saved.applications[0].status,'won');assert.equal(saved.applications[1].status,'lost');
 assert.equal(saved.applications[0].fulfillment.payment.method,'payPay');
 assert.equal(initial.applications.length,0);
});
test('legacy single ticket inference does not duplicate its application',()=>{
 const reception={seatTypes:[{id:'s'}],applications:[{id:'old',status:'won',quantity:2}]};
 const saved=helpers.withLotteryEntries(reception,()=>{throw Error('unexpected new record')});
 assert.equal(saved.applications.length,1);assert.equal(saved.applications[0].id,'old');
 assert.equal(saved.applications[0].seatTypeId,'s');assert.equal(saved.applications[0].quantity,2);
});
