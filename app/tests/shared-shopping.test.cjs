const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,requireFn=()=>({})){const context={exports:{},require:requireFn};const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(src,context);return context.exports;}
const shopping=load('src/services/shopping.ts');
const service=load('src/services/sharedShopping.ts',name=>name==='./shopping'?shopping:{});
function original(){const m=shopping.emptyShopping();m.products=[{id:'item',name:'商品',variant:'',category:'グッズ',price:500,limit:null}];m.buyers.push({id:'friend',name:'個人の同行者'});m.orders={self:{item:{quantity:2,status:'未購入',memo:'個人メモ'}}};m.bonuses={self:[1]};m.soldOut=['item'];return m;}
test('default share excludes personal buyers, orders, notes and allocation',()=>{const source=original();const result=service.sharedSeed(source,'表示名',false);assert.equal(result.buyers.length,1);assert.equal(result.buyers[0].name,'表示名');assert.equal(Object.keys(result.orders).length,0);assert.equal(Object.keys(result.bonuses).length,0);assert.equal(result.soldOut.length,0);assert.equal(result.products.length,1);assert.equal(source.orders.self.item.memo,'個人メモ');});
test('explicit inclusion retains order data and labels owner',()=>{const source=original();const result=service.sharedSeed(source,'表示名',true);assert.equal(result.orders.self.item.quantity,2);assert.equal(result.buyers[0].name,'表示名');assert.equal(source.buyers[0].name,'自分');assert.equal(result.buyers[1].name,'個人の同行者');});
test('cloud document validation rejects malformed nested data',()=>{assert.equal(service.validMemo(original()),true);for(const change of [{orders:{self:{item:null}}},{products:[{name:'x'}]},{bonusLabels:[{}]},{buyers:[null]},{bonuses:{self:[-1]}},{orders:{self:{item:{quantity:-1,status:'未購入',memo:''}}}}])assert.equal(service.validMemo({...original(),...change}),false);});
