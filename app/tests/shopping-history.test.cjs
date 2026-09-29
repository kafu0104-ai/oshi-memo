const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(path){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});return api;}
const api=load('src/services/shoppingHistory.ts');
const memo={products:[{id:'p',name:'商品',price:500,variant:'A'}],buyers:[{id:'self',name:'自分'}],orders:{self:{p:{quantity:2,status:'購入済み',memo:''}}},bonuses:{self:[1]}};
test('購入履歴は重複せず、購入取消を反映する',()=>{
 let m=api.recordPurchases(memo,'trip','2026-09-29');
 m=api.recordPurchases(m,'trip','2026-09-30');assert.equal(m.purchaseHistory.length,1);assert.equal(m.purchaseHistory[0].purchasedAt,'2026-09-29');
 const undone=api.recordPurchases({...m,orders:{self:{p:{quantity:2,status:'未購入'}}}},'trip','2026-09-30');assert.equal(undone.purchaseHistory.length,0);
});
test('次回へ進んでも履歴と商品を保持し同じ商品を再購入できる',()=>{
 const next=api.nextShopping(api.recordPurchases(memo,'first','2026-09-29'),'second');
 assert.equal(next.products.length,1);assert.equal(Object.keys(next.orders).length,0);assert.equal(Object.keys(next.bonuses).length,0);
 const bought=api.recordPurchases({...next,orders:memo.orders},'second','2026-10-01');assert.equal(bought.purchaseHistory.length,2);
});
const settlements=load('src/services/companionSettlements.ts');
test('自分が支払う同行者分を重複なく自動作成し受領済みを維持',()=>{
 const app={companionIds:['friend'],fulfillment:{payment:{payerId:'self',settlements:[]}}};
 let result=settlements.withCompanionSettlements(app,()=> 's');assert.equal(result.fulfillment.payment.settlements[0].direction,'receive');
 result.fulfillment.payment.settlements[0].isSettled=true;
 result=settlements.withCompanionSettlements(result,()=> 's2');assert.equal(result.fulfillment.payment.settlements.length,1);assert.equal(result.fulfillment.payment.settlements[0].isSettled,true);
 assert.equal(settlements.withCompanionSettlements({...app,fulfillment:{payment:{payerId:'friend',settlements:[]}}},()=> 's').fulfillment.payment.settlements.length,0);
});
