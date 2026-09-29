const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const data=new Map(),api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/exchangeHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
test('編集済みの文章と入力を履歴からそのまま復元',()=>{
 const fields=Object.fromEntries(['shop','product','offer','seek','delivery','packing','shipping','address','note','partner'].map(k=>[k,'入力']));
 const item={id:'1',name:'募集',createdAt:'2026-09-28T12:00:00Z',kind:'post',fields:{...fields,mailPreferred:true},text:'手直しした文章'};
 api.saveExchangeHistory([item]);const read=api.loadExchangeHistory()[0];assert.equal(read.text,item.text);assert.equal(read.fields.mailPreferred,true);assert.equal(read.name,item.name);
 api.saveExchangeHistory([]);assert.equal(api.loadExchangeHistory().length,0);
});
test('壊れた履歴を空の履歴で上書きしない',()=>{data.set(api.EXCHANGE_HISTORY_KEY,'invalid');assert.throws(()=>api.loadExchangeHistory());assert.equal(data.get(api.EXCHANGE_HISTORY_KEY),'invalid');});
