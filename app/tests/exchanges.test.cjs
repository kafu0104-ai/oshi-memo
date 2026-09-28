const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const data=new Map(),api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/exchanges.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
const record={id:'test',kind:'exchange',stage:'active',partner:'相手',outgoing:[{name:'A',quantity:1}],incoming:[{name:'B',quantity:1}],method:'mail',money:'none',amount:'',deadline:'',time:'',done:{}};
test('取引種別に必要な確認だけを作る',()=>{
 assert.equal(api.exchangeSteps(record).map(s=>s.id).join(','),'send,receive,notified,delivered');
 assert.equal(api.exchangeSteps({...record,kind:'receive',money:'pay'}).map(s=>s.id).join(','),'money,receive,notified');
 assert.equal(api.exchangeSteps({...record,kind:'give'}).map(s=>s.id).join(','),'send,delivered');
});
test('不正な個数と未確認の完了を保存しない',()=>{
 for(const quantity of [NaN,0,-1,1.5])assert.ok(api.exchangeError({...record,outgoing:[{name:'A',quantity}]}));
 assert.ok(api.exchangeError({...record,stage:'completed'}));
 assert.equal(api.exchangeError({...record,stage:'completed',done:{send:true,receive:true,notified:true,delivered:true}}),'');
});
test('保存と読み込み、壊れたデータを保持',()=>{
 api.saveExchanges([record]);assert.equal(api.loadExchanges()[0].partner,'相手');
 data.set(api.EXCHANGE_KEY,'broken');assert.throws(()=>api.loadExchanges());assert.equal(data.get(api.EXCHANGE_KEY),'broken');
});
