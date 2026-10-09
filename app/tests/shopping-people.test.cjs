const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function setup(){
 const data=new Map(),key='oshi-memo-companions';let fail=false,id=0;
 const memo={buyers:[{id:'self',name:'自分'}],orders:{self:{p:{quantity:2}}},purchaseHistory:[{id:'history'}]};data.set('memo',JSON.stringify(memo));
 const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const load=()=>JSON.parse(data.get('memo'));
 const exports={};const deps={
 './id':{generateId:()=>`person-${++id}`},
 './storage':{loadCompanions:()=>JSON.parse(data.get(key)||'[]'),saveCompanions:p=>data.set(key,JSON.stringify(p))},
 './shopping':{loadShopping:load,saveShopping:(_,m)=>{if(fail)throw Error('quota');data.set('memo',JSON.stringify(m));}},
 './personalDataLock':{withPersonalDataLock:fn=>Promise.resolve().then(fn)}
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/shoppingPeople.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,localStorage,require:p=>deps[p]});
 return {add:exports.addShoppingPerson,load,data,fail:()=>fail=true,key};
}
test('new buyer shares a stable person ID and preserves quantities/history',async()=>{
 const a=setup();const result=await a.add('memo',a.load(),' とこ ');const people=JSON.parse(a.data.get(a.key));assert.equal(people[0].id,result.buyers[1].id);assert.equal(people[0].name,'とこ');assert.equal(a.load().buyers[1].id,people[0].id);assert.equal(result.orders.self.p.quantity,2);assert.equal(result.purchaseHistory[0].id,'history');
 const before=JSON.stringify([...a.data]);await assert.rejects(a.add('memo',a.load(),'とこ'),/すでに登録/);assert.equal(JSON.stringify([...a.data]),before);
});
test('existing global and legacy local names are rejected without writes',async()=>{
 for(const global of [true,false]){const a=setup();if(global)a.data.set(a.key,JSON.stringify([{id:'old',name:'とこ'}]));else a.data.set('memo',JSON.stringify({...a.load(),buyers:[{id:'legacy',name:'とこ'}]}));const before=JSON.stringify([...a.data]);await assert.rejects(a.add('memo',a.load(),' とこ '),/すでに登録/);assert.equal(JSON.stringify([...a.data]),before);}
});
test('failed memo write rolls back person creation',async()=>{const a=setup(),before=JSON.stringify([...a.data]);a.fail();await assert.rejects(a.add('memo',a.load(),'新しい人'),/quota/);assert.equal(JSON.stringify([...a.data]),before);});
test('stale memo is rejected before creating a person',async()=>{const a=setup(),old=a.load();a.data.set('memo',JSON.stringify({...old,info:{title:'変更'}}));await assert.rejects(a.add('memo',old,'新しい人'),/更新/);assert.equal(a.data.has(a.key),false);});
