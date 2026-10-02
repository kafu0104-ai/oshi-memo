const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/ticketTasks.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,require:()=>({})});
const task=(eventId,companionId,completed=false,amount=3000)=>({eventId,companionId,person:companionId,receive:true,completed,amount,tagIds:['income']});
test('イベント別にまとめ、同じ相手の複数券も残額へ合算',()=>{const result=api.groupReceiptTasks([task('e','a'),task('e','a'),task('e','b',true),task('other','c')]);assert.equal(result.length,2);assert.equal(result[0].amount,6000);assert.match(result[0].title,/あと1人/);assert.equal(result[0].members.length,3);assert.equal(result[0].completed,false);});
test('全員受領で完了、チェック取消で未完了に戻る',()=>{assert.equal(api.groupReceiptTasks([task('e','a',true),task('e','b',true)])[0].completed,true);assert.equal(api.groupReceiptTasks([task('e','a',false),task('e','b',true)])[0].completed,false);});
test('金額未設定はゼロとして確定しない',()=>{const t=task('e','a');t.amount=undefined;assert.equal(api.groupReceiptTasks([t])[0].amount,undefined);});
