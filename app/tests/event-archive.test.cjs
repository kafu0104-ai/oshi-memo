const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/eventArchive.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const event={id:'e',title:'イベント',startDate:'2026-10-01',endDate:'2026-10-04',venue:''};
test('final day remains active; following day is archived without mutating data',()=>{assert.equal(api.isPastEvent(event,'2026-10-04'),false);assert.equal(api.isPastEvent(event,'2026-10-05'),true);assert.equal(event.endDate,'2026-10-04');});
test('single day and unknown or invalid dates',()=>{assert.equal(api.isPastEvent({...event,endDate:''},'2026-10-02'),true);for(const e of [{...event,startDate:'',endDate:''},{...event,endDate:'2026-02-30'},{...event,endDate:'2026-09-30'}])assert.equal(api.isPastEvent(e,'2026-10-05'),false);});
test('personal visit takes precedence over long public period',()=>{assert.equal(api.isPastEvent({...event,endDate:'2026-12-31',attendanceDate:'2026-10-02'},'2026-10-03'),true);});
test('tour remains active until the last performance and undated performances stay visible',()=>{const e={...event,performances:[{date:'2026-10-02'},{date:'2026-10-10'}]};assert.equal(api.isPastEvent(e,'2026-10-05'),false);assert.equal(api.isPastEvent(e,'2026-10-11'),true);assert.equal(api.isPastEvent({...e,performances:[{date:'2026-10-02'},{date:''}]},'2026-10-11'),false);});
test('multiple visits and pending lottery visits remain until the final visit',()=>{const e={...event,entryPeriods:[{entries:[{date:'2026-10-02',result:'当選'},{date:'2026-10-09',result:'結果待ち'},{date:'2026-11-01',result:'落選'}]}]};assert.equal(api.isPastEvent(e,'2026-10-05'),false);assert.equal(api.isPastEvent(e,'2026-10-10'),true);});
test('changing an archived date to the future restores it automatically',()=>{assert.equal(api.isPastEvent(event,'2026-10-05'),true);assert.equal(api.isPastEvent({...event,endDate:'2026-10-07'},'2026-10-05'),false);});

test('past attendance with the form default empty entry is archived without public dates',()=>{
 const e={...event,startDate:'',endDate:'',mainGenreId:'exhibition',attendanceDate:'2026-09-26',entryPeriods:[{entries:[{id:'initial-entry',date:'',time:'',result:'結果待ち'}]}]};
 assert.equal(api.isPastEvent(e,'2026-10-04'),true);
 assert.equal(api.isPastEvent({...e,attendanceDate:'2026-10-04'},'2026-10-04'),false);
 assert.equal(api.isPastEvent({...e,attendanceDate:''},'2026-10-04'),false);
});
test('empty legacy attendance placeholders do not block dates; actual future visits still do',()=>{
 const e={...event,attendanceDate:'2026-09-26',attendanceEntries:[{date:'',time:'',result:'結果待ち'}]};
 assert.equal(api.isPastEvent(e,'2026-10-04'),true);
 assert.equal(api.isPastEvent({...e,attendanceEntries:[{date:'2026-10-10',time:'',result:'当選'}]},'2026-10-04'),false);
 assert.equal(api.isPastEvent({...e,attendanceEntries:[{date:'',time:'12:00',result:'結果待ち'}]},'2026-10-04'),false);
});
