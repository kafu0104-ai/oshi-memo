const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MemoryRouter}=require('react-router'),Summary=require('../src/components/event/GenreSummary.tsx').default;
const event={id:'event',entryPeriods:[{id:'period',method:'抽選',entries:[{id:'entry',date:'',time:'',result:'結果待ち'}]}],performances:[{id:'show',date:'2026-11-23',name:'夜公演',schedule:[]}]};
const reception={id:'ticket',sourceEntryPeriodId:'period',receptionType:'lottery',seatTypes:[{id:'seat',name:'指定席'}],applications:[{id:'app',seatTypeId:'seat',performanceId:'show',status:'won'}]};
const render=(receptions=[],e=event)=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Summary,{event:e,receptions})));
test('当選はチケットから表示し、古い結果待ちを表示しない',()=>{const html=render([reception]);assert.match(html,/当選・購入確定/);assert.match(html,/2026-11-23 夜公演/);assert.doesNotMatch(html,/結果待ち/);assert.match(html,/tickets\/ticket\/edit/)});
test('申込ごとの結果を保ち、未入力の参加日時を表示しない',()=>{assert.doesNotMatch(render(),/日付未定|結果待ち/);const html=render([{...reception,applications:[...reception.applications,{id:'other',status:'lost'}]}]);assert.match(html,/当選・購入確定/);assert.match(html,/落選/)});
test('チケットと連携しない参加日時は保持',()=>{const e={...event,entryPeriods:[{...event.entryPeriods[0],entries:[{id:'visit',date:'2026-11-23',result:'当選'}]}]};assert.match(render([],e),/参加日時 1：2026-11-23.*当選/)});
