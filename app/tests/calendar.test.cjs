const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const data=new Map(),api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/calendar.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,structuredClone,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
const event={id:'e',title:'展示',startDate:'2026-10-01',endDate:'2026-10-31'};
test('長期間のイベントは初日と最終日、参加日指定なら参加日のみ',()=>{
 assert.equal(api.calendarPlans([event],[],[]).length,2);
 const items=api.calendarPlans([{...event,attendanceDate:'2026-10-15'}],[],[]);
 assert.equal(items.length,1);assert.equal(items[0].date,'2026-10-15');
});
test('抽選回とチケットの重複を避け、支払期限も表示',()=>{
 const e={...event,entryPeriods:[{id:'p',method:'抽選',entries:[],applicationEnd:'2026-09-30',resultDate:'2026-10-02'}]};
 const tickets=[{id:'t',eventId:'e',receptions:[{id:'r',name:'先行',sourceEntryPeriodId:'p',applicationDeadlineDate:'2026-09-30',resultDate:'2026-10-02',applications:[{fulfillment:{payment:{deadlineDate:'2026-10-04',isPaid:false}}}]}]}];
 const plans=api.calendarPlans([e],tickets,[]);
 assert.equal(plans.filter(p=>p.date==='2026-09-30').length,1);
 assert.equal(plans.filter(p=>p.date==='2026-10-02').length,1);
 assert.ok(plans.some(p=>p.date==='2026-10-04'));
});
test('中止・完了した交換は予定に出さない',()=>{
 const x={id:'x',partner:'相手',deadline:'2026-10-03',method:'hand'};
 assert.equal(api.calendarPlans([],[],[{...x,stage:'active'}]).length,1);
 assert.equal(api.calendarPlans([],[],[{...x,stage:'cancelled'},{...x,stage:'completed'}]).length,0);
});
test('設定と割り当てを保存し、背景色に応じて文字色を変更',()=>{
 const settings={...api.defaultCalendar,weight:700,assignments:{plan:'event'}};
 api.saveCalendar(settings);assert.equal(api.loadCalendar().weight,700);assert.equal(api.loadCalendar().assignments.plan,'event');
 assert.equal(api.textOnColor('#ffffff'),'#000000');assert.equal(api.textOnColor('#000000'),'#ffffff');
 data.set(api.CALENDAR_KEY,'broken');assert.throws(()=>api.loadCalendar());
});
