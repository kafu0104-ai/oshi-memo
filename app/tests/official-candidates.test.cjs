const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const {periodCandidate,labeledTimes,structuredCandidates,fieldStates}=require('../src/services/officialCandidates.ts');
test('explicit date formats, contextual omitted year and rollover require confirmation',()=>{
 for(const s of ['2026年9月16日～2026年12月7日','2026/9/16～12/7','2026.09.16 - 12.07'])assert.deepEqual(periodCandidate(s),{startDate:'2026-09-16',endDate:'2026-12-07',confirmation:undefined});
 assert.equal(periodCandidate('9月16日～12月7日'),undefined);assert.ok(periodCandidate('9月16日～12月7日',[2026]).confirmation);assert.equal(periodCandidate('10月17日（土）',[2026]).startDate,'2026-10-17');assert.equal(periodCandidate('10月17日',[2026,2027]),undefined);
 assert.equal(periodCandidate('2026年12月30日～2027年1月3日').confirmation,undefined);assert.equal(periodCandidate('2026年12月30日～1月3日').endDate,'2027-01-03');assert.ok(periodCandidate('2026年12月30日～1月3日').confirmation);
 for(const s of ['2026/2/30','2026/10/17～16'])assert.equal(periodCandidate(s),undefined);
});
test('Japanese and English clock labels never invent a missing start',()=>{
 assert.deepEqual(labeledTimes('OPEN 17:00 / START 18:00','開場|\\bOPEN\\b'),['17:00']);assert.deepEqual(labeledTimes('17時開場 18時30分開演','開演'),['18:30']);assert.deepEqual(labeledTimes('受付開始 10:00','受付開始'),['10:00']);assert.deepEqual(labeledTimes('当選発表 18:00','当落発表|抽選結果発表|当選発表'),['18:00']);assert.deepEqual(labeledTimes('開場17:00','開演'),[]);assert.deepEqual(labeledTimes('開演25:00','開演'),[]);
});
test('JSON-LD retains separate performances, address, performer, start and end time',()=>{
 const candidates=structuredCandidates([{'@graph':[{ '@type':'MusicEvent',name:'東京公演',startDate:'2026-10-17T18:00:00+09:00',endDate:'2026-10-17T20:00:00+09:00',location:{name:'東京会場',address:{addressRegion:'東京都',streetAddress:'1-2'}},performer:[{name:'出演者A'}],url:'/tokyo'},{'@type':'MusicEvent',name:'大阪公演',startDate:'2026-10-24T17:00:00+09:00',location:{name:'大阪会場'}}]}],'https://example.com/','now');
 assert.equal(candidates.length,2);assert.equal(candidates[0].fields.startTime,'18:00');assert.equal(candidates[0].fields.endTime,'20:00');assert.equal(candidates[0].fields.performers,'出演者A');assert.equal(candidates[0].performance.venue,'東京会場 ／ 東京都1-2');assert.equal(candidates[1].performance.date,'2026-10-24');assert.equal(candidates[1].fields.startTime,'17:00');assert.equal(candidates[0].detailUrl,'https://example.com/tokyo');assert.equal(fieldStates(candidates).startDate.status,'ambiguous');
});
test('provenance retains the value and source; empty results distinguish errors',()=>{
 const [c]=structuredCandidates([{'@type':'Event',name:'展示会',startDate:'2026-10-17'}],'https://example.com/','2026-10-01T00:00:00Z');assert.equal(c.evidence.startDate.method,'JSON-LD');assert.equal(c.evidence.startDate.fetchedAt,'2026-10-01T00:00:00Z');assert.equal(fieldStates([c]).title.status,'notApplied');assert.equal(fieldStates([]).venue.status,'notFound');assert.equal(fieldStates([],[{url:'x',status:'error',reason:'timeout'}]).venue.status,'error');
});
const {canonicalUrl,linkPriority,relevance,OfficialDiscovery}=require('../src/services/officialDiscovery.ts');
test('related URL canonicalization and field-specific priorities',()=>{
 assert.equal(canonicalUrl('/access?utm_source=x#map','https://example.com/'),'https://example.com/access');assert.equal(canonicalUrl('javascript:alert(1)','https://example.com/'),undefined);assert.ok(linkPriority('アクセス access','venue')>linkPriority('ticket','venue'));
});
test('other years never merge; shared site names alone stay uncertain',()=>{
 const c=(title,date)=>({fields:{title,startDate:date}});assert.equal(relevance([c('展覧会2026','2026-10-17')],[c('展覧会2025','2025-10-17')],'about'),'unrelated');assert.equal(relevance([c('展示会A','2026-10-17')],[c('展示会B','2026-10-17')],'access'),'uncertain');
});
test('URL failure is retained with reason and retry shares the attempted budget',async()=>{
 let calls=0;const d=new OfficialDiscovery('https://example.com/',async()=>{calls++;throw Error('タイムアウト');});const first=await d.search();assert.equal(first.fields.venue.status,'error');assert.equal(first.issues[0].reason,'タイムアウト');await d.search('venue');assert.equal(calls,1);assert.equal(d.remaining,7);
});
const selectionApi=require('../src/services/officialSelection.ts');
test('nothing applies without a selection; date/venue/time selection is atomic',()=>{
 const candidates=structuredCandidates([{'@type':'MusicEvent',name:'A',startDate:'2026-10-17T18:00',location:{name:'東京'}},{'@type':'MusicEvent',name:'B',startDate:'2026-10-24T17:00',location:{name:'大阪'}}],'https://example.com/','now');
 const report={version:1,requestedUrl:'https://example.com/',fetchedAt:'now',candidates,issues:[],visited:[],fields:fieldStates(candidates)};
 assert.deepEqual(selectionApi.applySelection(report,selectionApi.emptySelection()).fields,{});
 let selection=selectionApi.chooseFields(selectionApi.emptySelection(),report,candidates[0].id,['startDate','venue','startTime'],true);
 selection=selectionApi.chooseFields(selection,report,candidates[1].id,['startDate','venue','startTime'],true);
 const applied=selectionApi.applySelection(report,selection);assert.equal(applied.fields.venue,'大阪');assert.equal(applied.fields.startTime,'17:00');assert.equal(applied.fields.title,undefined);assert.equal(applied.report.fields.startDate.applied[0].sourceUrl,'https://example.com/');
 const shows=selectionApi.applySelection(report,{fields:{},shows:candidates.map(c=>c.id),rounds:[]});assert.equal(shows.shows.length,2);assert.equal(shows.shows[0].venue,'東京');assert.equal(shows.shows[1].startTime,'17:00');assert.equal(shows.fields.startTime,undefined);
 const persisted=JSON.parse(JSON.stringify(applied.report));assert.deepEqual(persisted.fields.startDate.applied,applied.report.fields.startDate.applied);
});
test('time adjacency does not swap OPEN/START or Japanese postfix times',()=>{
 for(const [input,open,start]of [['OPEN 17:00 START 18:00','17:00','18:00'],['17時開場 18時開演','17:00','18:00'],['開場17:00 開演18:00','17:00','18:00']]){assert.deepEqual(labeledTimes(input,'開場|\\bOPEN\\b'),[open]);assert.deepEqual(labeledTimes(input,'開演|\\bSTART\\b'),[start]);}
});
test('all result labels retain explicitly stated result time',()=>{
 const {lotteryRoundsFromText}=require('../src/services/officialImport.ts');for(const label of ['当落発表','抽選結果発表','当選発表','当選のご連絡']){const [round]=lotteryRoundsFromText(`第1期 抽選対象期間 2026年10月17日～2026年10月24日 応募期間 2026年10月1日～2026年10月10日 ${label} 2026年10月12日（月）18:00`);assert.equal(round.resultTime,'18:00');assert.equal(round.resultDate,'2026-10-12');}
});
test('import metadata survives existing personal snapshot export and restore',()=>{
 const {captureSnapshot,restoreSnapshot}=require('../src/services/personalSnapshot.ts');const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),get length(){return values.size},key:i=>[...values.keys()][i]??null};
 const [candidate]=structuredCandidates([{'@type':'Event',name:'保存確認',startDate:'2026-10-17'}],'https://example.com/','now');const report={version:1,requestedUrl:'https://example.com/',fetchedAt:'now',candidates:[candidate],fields:fieldStates([candidate]),issues:[],visited:['https://example.com/']};
 storage.setItem('oshi-memo-events',JSON.stringify([{id:'test',title:'手入力名',officialImport:report}]));const snapshot=captureSnapshot(storage);values.clear();restoreSnapshot(snapshot,storage);const event=JSON.parse(storage.getItem('oshi-memo-events'))[0];assert.equal(event.title,'手入力名');assert.equal(event.officialImport.candidates[0].evidence.startDate.sourceUrl,'https://example.com/');
});
