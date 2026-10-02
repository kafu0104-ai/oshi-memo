const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), ts=require('typescript'), vm=require('node:vm');
function setup(){
 const data=new Map();const storage={get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,localStorage:storage,require:p=>load(path.resolve(path.dirname(file),p+'.ts'))});return exports;}
 return {...load('src/services/shopping.ts'),...load('src/services/shoppingMemos.ts'),storage};
}
test('旧メモのキーと内容を移動せず一覧化し、新規の独立メモと共存する',()=>{
 const a=setup(),old={...a.emptyShopping(),orders:{self:{p:{quantity:2,status:'購入済み',memo:'記録'}}},purchaseHistory:[{id:'history'}]};
 a.saveShopping('event',old);const raw=a.storage.getItem(a.shoppingKey('event'));
 a.saveShopping('standalone',{...a.emptyShopping(),info:{title:'通販'}});
 const list=a.listShoppingMemos([{id:'event',title:'ライブ'}]);assert.equal(list.items.length,2);assert.equal(list.items[0].title,'ライブ');assert.equal(list.items[1].eventId,undefined);assert.equal(a.storage.getItem(a.shoppingKey('event')),raw);
});
test('関連イベントの変更・解除でも数量と購入履歴を保持する',()=>{
 const a=setup();let m={...a.emptyShopping(),info:{title:'欲しいもの'},orders:{self:{p:{quantity:3}}},purchaseHistory:[{id:'h'}]};a.saveShopping('memo',m);
 a.saveShopping('memo',{...a.loadShopping('memo'),info:{title:'欲しいもの',eventId:'e'}});assert.equal(a.shoppingForEvent('e',[]).length,1);
 a.saveShopping('memo',{...a.loadShopping('memo'),info:{title:'通販に変更'}});assert.equal(a.shoppingForEvent('e',[]).length,0);assert.equal(a.loadShopping('memo').orders.self.p.quantity,3);assert.equal(a.loadShopping('memo').purchaseHistory[0].id,'h');assert.equal(a.storage.length,1);
});
test('イベントに複数のメモを紐づけ、イベント削除後も旧メモ名を保つ',()=>{
 const a=setup(),event={id:'e',title:'イベント名'};a.saveShopping('e',a.emptyShopping());a.saveShopping('other',{...a.emptyShopping(),info:{title:'別メモ',eventId:'e'}});assert.equal(a.shoppingForEvent('e',[event]).length,2);
 a.preserveEventShopping(event);assert.equal(a.listShoppingMemos([]).items.find(x=>x.id==='e').title,'イベント名');
});
test('不正なレコードを上書きせず報告し、正常なメモは利用できる',()=>{
 const a=setup();a.storage.setItem(a.shoppingKey('bad'),'broken');a.saveShopping('bad-info',{...a.emptyShopping(),info:{title:5}});a.saveShopping('good',{...a.emptyShopping(),info:{title:'正常'}});const result=a.listShoppingMemos([]);assert.equal(result.items.length,1);assert.equal(result.errors.length,2);assert.equal(a.storage.getItem(a.shoppingKey('bad')),'broken');
});
