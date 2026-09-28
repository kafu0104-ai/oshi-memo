const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const vm=require('node:vm');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(file) {file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const localRequire=name=>{if(!name.startsWith('.'))return require(name);const base=path.resolve(path.dirname(file),name);return load([base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p)));};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:localRequire,Date,URL,console});return exports;}
const genres=load('src/services/eventGenres.ts');const {upcomingEvents}=load('src/services/upcomingEvents.ts');
test('all eight genres have icons and additive fields deduplicate shared inputs',()=>{assert.equal(Object.keys(genres.genreIcons).length,8);const fields=genres.fieldsForTags(['live','talk','goods-sale']);assert.equal(fields.filter(f=>f.key==='performers').length,1);assert.ok(fields.some(f=>f.key==='entryMethod'));});
test('legacy genre is inferred without mutating the record',()=>{const e={tagIds:['movie','talk']};assert.equal(genres.mainGenre(e),'movie');assert.equal(e.mainGenreId,undefined);assert.equal(genres.mainGenre({...e,mainGenreId:'exhibition'}),'exhibition');});
test('home uses personal visit dates rather than exhibition opening date',()=>{const e={id:'e',title:'展示',startDate:'2026-09-01',endDate:'2026-10-30',attendanceDate:'2026-09-29'};assert.equal(upcomingEvents([e],'2026-09-28')[0].startDate,'2026-09-29');assert.equal(e.startDate,'2026-09-01');assert.equal(upcomingEvents([e],'2026-09-30').length,0);});
test('movie without a release period appears on its viewing date',()=>{const e={id:'m',title:'映画',startDate:'',endDate:'',attendanceDate:'2026-09-29'};assert.equal(upcomingEvents([e],'2026-09-28').length,1);});
test('new event starts with eight accessible genre buttons',()=>{const Form=load('src/components/event/EventForm.tsx').default;const html=renderToStaticMarkup(React.createElement(Form,{onSaveEvent(){},onCancel(){}}));assert.equal((html.match(/class="genre-tile"/g)||[]).length,8);assert.ok(html.includes('映画・上映'));assert.ok(!html.includes('id="event-title"'));});
test('movie form hides period, locks main genre and shows viewing fields',()=>{const Form=load('src/components/event/EventForm.tsx').default;const html=renderToStaticMarkup(React.createElement(Form,{editingEvent:{id:'e',mainGenreId:'movie',tagIds:['movie'],title:'映画',startDate:'',endDate:'',venue:''},onSaveEvent(){},onCancel(){}}));assert.ok(!html.includes('id="event-start-date"'));assert.ok(html.includes('鑑賞日'));assert.ok(html.includes('スクリーン'));assert.ok(html.includes('disabled=""'));});
test('goods lottery places entry method after end date and disables attendance only on loss',()=>{
 const Form=load('src/components/event/EventForm.tsx').default;
 const render=(method,result)=>renderToStaticMarkup(React.createElement(Form,{editingEvent:{id:'g',mainGenreId:'goods-sale',tagIds:['goods-sale'],title:'ショップ',startDate:'',endDate:'',venue:'',genreDetails:{entryMethod:method,entryResult:result,entryResultDate:'2026-10-01'}},onSaveEvent(){},onCancel(){}}));
 const lost=render('抽選','落選');
 assert.ok(lost.indexOf('id="event-end-date"')<lost.indexOf('入場方法'));
 assert.ok(lost.indexOf('当落発表日')<lost.indexOf('参加・来場する日'));
 assert.match(lost,/<select disabled=""/);
 assert.ok(lost.includes('2026-10-01'));
 assert.doesNotMatch(render('抽選','当選'),/<select disabled/);
 const free=render('自由入場','落選');
 assert.doesNotMatch(free,/<select disabled/);
 assert.ok(!free.includes('当落発表日'));
});
test('mixed entry periods retain dates and only exclude losing lottery entries from home',()=>{
 const entries=[{id:'a',date:'2026-10-01',time:'10:00',result:'落選'}];
 const event={id:'mixed',title:'店',tagIds:['goods-sale'],startDate:'2026-10-01',endDate:'2026-10-10',entryPeriods:[{id:'lot',method:'抽選',entries},{id:'free',method:'自由入場',entries:[{...entries[0],id:'b',date:'2026-10-05'}]}]};
 assert.equal(upcomingEvents([event],'2026-09-28')[0].startDate,'2026-10-05');
 assert.equal(event.entryPeriods[0].entries[0].date,'2026-10-01');
 assert.equal(genres.initialEntryPeriods(event),event.entryPeriods);
 const legacy=genres.initialEntryPeriods({attendanceDate:'2026-10-03',attendanceTime:'11:00',genreDetails:{entryMethod:'抽選',entryResult:'当選',entryResultDate:'2026-09-30'}});
 assert.equal(legacy[0].entries[0].date,'2026-10-03');
 assert.equal(legacy[0].entries[0].result,'当選');
 assert.equal(legacy[0].resultDate,'2026-09-30');
});
test('three lottery rounds keep independent application windows and results',()=>{
 const Periods=load('src/components/event/EntryPeriods.tsx').default;
 const periods=[1,2,3].map(n=>({id:String(n),name:`第${n}弾`,method:'抽選',startDate:`2026-10-${n}1`,endDate:`2026-10-${n}3`,applicationStart:'2026-09-28T10:00',applicationEnd:'2026-09-30T18:00',resultDate:'2026-10-01',resultTime:'12:00',entries:[{id:String(n),date:'2026-10-02',time:'10:00',result:n===2?'落選':'当選'}]}));
 const html=renderToStaticMarkup(React.createElement(Periods,{value:periods,onChange(){}}));
 for(const n of [1,2,3]) assert.ok(html.includes(`第${n}弾`));
 assert.equal((html.match(/抽選申込締切日時/g)||[]).length,3);
 assert.equal((html.match(/<select disabled/g)||[]).length,2);
});
test('entry method is selected before revealing period details; hours are separate times',()=>{
 const Periods=load('src/components/event/EntryPeriods.tsx').default;
 const initial=genres.initialEntryPeriods();
 const render=value=>renderToStaticMarkup(React.createElement(Periods,{value,onChange(){}}));
 const blank=render(initial);
 assert.ok(blank.includes('<span>入場方法</span>'));
 assert.ok(!blank.includes('入場期間の開始日'));
 assert.ok(!blank.includes('参加日時を追加'));
 const lottery=render([{...initial[0],method:'抽選'}]);
 assert.ok(lottery.includes('抽選申込開始日時'));
 assert.ok(lottery.includes('＋ 日付を追加'));
 assert.ok(!lottery.includes('入場期間の開始日')); 
 const fields=genres.fieldsForTags(['goods-sale']);
 assert.equal(fields.find(f=>f.key==='openingTime').type,'time');
 assert.equal(fields.find(f=>f.key==='closingTime').type,'time');
});
test('home only shows winning lottery slots and skips waiting or all-lost rounds',()=>{
 const event={id:'lottery',title:'店',tagIds:['goods-sale'],startDate:'2026-10-01',endDate:'2026-10-10',entryPeriods:[{id:'round',method:'抽選',entries:[{id:'1',date:'2026-10-01',time:'10:00',result:'結果待ち'},{id:'2',date:'2026-10-02',time:'11:00',result:'落選'},{id:'3',date:'2026-10-03',time:'12:00',result:'当選'}]}]};
 assert.equal(upcomingEvents([event],'2026-09-28')[0].startDate,'2026-10-03');
 event.entryPeriods[0].entries[2].result='落選';
 assert.equal(upcomingEvents([event],'2026-09-28').length,0);
});
test('multiple times on a date share a collapsible date heading and winner checkboxes',()=>{
 const Periods=load('src/components/event/EntryPeriods.tsx').default;
 const period={id:'r',method:'抽選',resultDate:'',resultTime:'',entries:['10:00','12:00','20:00'].map((time,i)=>({id:String(i),date:'2026-10-03',time,result:'結果待ち'}))};
 const html=renderToStaticMarkup(React.createElement(Periods,{value:[period],onChange(){}}));
 assert.equal((html.match(/<details/g)||[]).length,1);
 assert.equal((html.match(/type="checkbox"/g)||[]).length,3);
 assert.ok(html.includes('2026/10/03（3枠）'));
 assert.ok(!html.includes('入場期間の開始日'));
});
test('numbered admission shows only number, entry time and meeting time',()=>{
 const Periods=load('src/components/event/EntryPeriods.tsx').default;
 const period={id:'q',method:'整理券',queueNumber:'A-123',queueMeetingTime:'09:50',entries:[{id:'old',date:'2026-10-03',time:'10:00',result:'結果待ち'}]};
 const html=renderToStaticMarkup(React.createElement(Periods,{value:[period],onChange(){}}));
 assert.ok(html.includes('整理番号'));
 assert.ok(html.includes('A-123'));
 assert.ok(html.includes('09:50'));
 assert.ok(html.includes('10:00'));
 assert.ok(!html.includes('type="date"'));
 assert.ok(!html.includes('抽選回の名前'));
 assert.ok(!html.includes('＋ 時刻を追加'));
 assert.ok(!html.includes('＋ 日付を追加'));
 assert.equal(period.entries[0].date,'2026-10-03');
});
