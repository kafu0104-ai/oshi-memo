const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
function load(path,requires={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>requires[name]});return exports;}
const api=load('src/services/goodsLayout.ts',{'./goodsImport':load('src/services/goodsImport.ts')});
const line=(text,x0,y0,x1,y1)=>({text,bbox:{x0,y0,x1,y1}});
test('side by side products receive distinct image regions and matching names',()=>{
const result=api.layoutCandidates([line('商品A',50,300,200,320),line('500円',80,330,180,350),line('商品B',550,300,700,320),line('900円',580,330,680,350)],1000,600,'source');
assert.equal(result.length,2);assert.equal(result[0].name,'商品A');assert.equal(result[1].price,'900');assert.ok(result[0].crop.x+result[0].crop.width<=result[1].crop.x);assert.ok(result[0].crop.height>50);
});
test('vertically stacked products do not reuse the first product region',()=>{
const result=api.layoutCandidates([line('商品A',10,200,100,220),line('500円',10,230,100,250),line('商品B',10,500,100,520),line('900円',10,530,100,550)],500,600,'source');assert.equal(result[1].name,'商品B');assert.ok(result[1].crop.y>40);assert.ok(result[1].crop.y+result[1].crop.height<=100);
});
