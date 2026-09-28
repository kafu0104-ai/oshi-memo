const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/services/shopping.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function service(){const data=new Map();const context={exports:{},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};vm.runInNewContext(source,context);return context.exports;}
function fixture(s){const m=s.emptyShopping();m.products=[{id:'p',name:'商品',price:1600,limit:5,variant:'',category:''}];m.buyers.push({id:'friend',name:'友人'});m.orders={self:{p:{quantity:1,status:'未購入',memo:''}},friend:{p:{quantity:1,status:'購入済み',memo:''}}};m.bonusThreshold=3000;return m;}
test('individual totals and combined bonus rounding',()=>{const s=service(),m=fixture(s);assert.equal(s.totals(m,'self').amount,1600);assert.equal(s.totals(m,'self').bonus,0);assert.equal(s.totals(m).bonus,1);assert.equal(s.totals(m).purchased,1600);});
test('sold out excludes pending but retains purchased history',()=>{const s=service(),m=fixture(s);m.soldOut=['p'];assert.equal(s.totals(m).amount,1600);assert.equal(s.totals(m).count,1);m.orders.friend.p.status='見送り';assert.equal(s.totals(m).amount,0);});
test('event data remains separate and persists',()=>{const s=service(),m=fixture(s);s.saveShopping('a',m);assert.equal(s.loadShopping('a').products.length,1);assert.equal(s.loadShopping('b').products.length,0);});
