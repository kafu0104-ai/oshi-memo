const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/performanceSchedule.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const imported=[{id:'random-1',type:'doorsOpen',label:'開場',time:'17:00'},{id:'random-2',type:'start',label:'開演',time:'18:00'}];
test('以前取り込んだランダムIDでも公演スケジュールに時刻を表示',()=>{
 assert.equal(api.scheduleTime(imported,'doors-open'),'17:00');assert.equal(api.scheduleTime(imported,'performance-start'),'18:00');
});
test('読み込み後の編集・再読み込みで同じ種類の時刻を重複させない',()=>{
 let schedule=api.setScheduleTime(imported,'doors-open','doorsOpen','開場','17:30');
 schedule=api.setScheduleTime(schedule,'doors-open','doorsOpen','開場','17:00');
 assert.equal(schedule.length,2);assert.equal(api.scheduleTime(schedule,'doors-open'),'17:00');
});
test('重複済みの項目は手編集を優先し、時刻の削除や独自メモも保持',()=>{
 const custom={id:'note',type:'custom',label:'集合',time:'16:00'};
 const schedule=api.normalizeSchedule([...imported,{id:'doors-open',type:'doorsOpen',label:'開場',time:''},custom]);
 assert.equal(schedule.length,3);assert.equal(api.scheduleTime(schedule,'doors-open'),'');assert.equal(api.scheduleTime(schedule,'performance-start'),'18:00');assert.ok(schedule.some(s=>s.id==='note'));
});
