const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function setup(width,height){
 const api={},outputs=[];let requests=0;
 const context={exports:api,setTimeout,clearTimeout,AbortSignal,Image:class{naturalWidth=width;naturalHeight=height;set src(value){queueMicrotask(()=>this.onload());}},document:{createElement(){const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL(type,quality){outputs.push({width:canvas.width,height:canvas.height,type,quality});return 'data:image/jpeg;base64,AA==';}};return canvas;}},fetch:async()=>{requests++;return{ok:true,json:async()=>({html:'data:image/jpeg;base64,AA=='})};}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/productThumbnail.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {api,outputs,requests:()=>requests};
}
test('large portrait is reduced proportionally to 600px',async()=>{const s=setup(2000,4000);await s.api.compressProductImage('data:image/jpeg;base64,AA==');assert.deepEqual(s.outputs[0],{width:300,height:600,type:'image/jpeg',quality:0.8});});
test('small images are not enlarged',async()=>{const s=setup(100,200);await s.api.compressProductImage('data:image/jpeg;base64,AA==');assert.equal(s.outputs[0].width,100);assert.equal(s.outputs[0].height,200);});
test('concurrent requests share one fetch; unavailable cache does not lose image',async()=>{const s=setup(1000,1000);const result=await Promise.all([s.api.productThumbnail('https://example.com/a.jpg'),s.api.productThumbnail('https://example.com/a.jpg')]);assert.equal(s.requests(),1);assert.ok(result.every(x=>x==='data:image/jpeg;base64,AA=='));});
