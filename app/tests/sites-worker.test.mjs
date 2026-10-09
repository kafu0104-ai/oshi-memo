import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, publicUrl, publicAddress, readRemote } from '../server/sites-worker.mjs';
test('private destinations and credentials are rejected', () => {
  for (const url of ['http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://foo.internal']) assert.throws(() => publicUrl(url));
  for (const ip of ['127.0.0.1','10.0.0.1','192.168.1.27','169.254.169.254','::1']) assert.equal(publicAddress(ip),false);
});
test('redirects are validated', async () => {
  const mock=async url=>String(url).includes('dns-query')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});
  await assert.rejects(readRemote('https://example.com',false,mock));
});
test('origin is required; callback route serves app; no indexing', async () => {
  const h=createHandler({'/index.html':{type:'text/html',body:btoa('app')}});
  assert.equal((await h.fetch(new Request('https://test.example/api/official-page',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}))).status,403);
  const r=await h.fetch(new Request('https://test.example/auth/callback?code=example'));
  assert.equal(await r.text(),'app');assert.match(r.headers.get('x-robots-tag'),/noindex/);
  assert.equal((await h.fetch(new Request('https://test.example/missing.js'))).status,404);
});
test('public HTML import', async () => {
  const mock=async (url,options)=>{if(String(url).includes('dns-query'))return Response.json({Answer:[{type:1,data:'93.184.216.34'}]});assert.equal(options.headers['User-Agent'],'OshiMemo-EventImport/1.0');return new Response('<html>ok</html>',{headers:{'content-type':'text/html'}});};
  assert.equal((await readRemote('https://example.com',false,mock)).html,'<html>ok</html>');
});

test('large product images above the previous 8MB limit are accepted', async () => {
  const bytes = new Uint8Array(9_680_134); bytes[0]=255; bytes[1]=216; bytes[bytes.length-1]=217;
  const mock = async url => String(url).includes('dns-query') ? Response.json({Answer:[{type:1,data:'93.184.216.34'}]}) : new Response(bytes,{headers:{'content-type':'image/jpeg','content-length':String(bytes.length)}});
  const result = await readRemote('https://example.com/product.jpg',true,mock);
  const decoded = Buffer.from(result.html.split(',')[1],'base64');
  assert.equal(decoded.length,bytes.length); assert.equal(decoded[0],255); assert.equal(decoded.at(-1),217);
});
test('oversized images are still rejected', async () => {
  const mock = async url => String(url).includes('dns-query') ? Response.json({Answer:[{type:1,data:'93.184.216.34'}]}) : new Response('x',{headers:{'content-type':'image/jpeg','content-length':'25000001'}});
  await assert.rejects(readRemote('https://example.com/product.jpg',true,mock),/大きすぎ/);
});

import {studioPageUrl, studioTextHtml, readOfficialPage, enrichOfficialPage} from '../server/sites-worker.mjs';
const studioTable = [['Reactive',1],{pinia:2},['Reactive',3],{projectStore:4,productStore:7},{project:5},{snapshot_path:6},'https://storage.googleapis.com/studio-publish/projects/sample/snapshot/',{product:8},{pages:9},[10,14],{id:11,type:12,uuid:13},'/','page','bf9fed39-ac7e-4c42-aa12-40d655a39612',{id:15,type:12,uuid:16},'other','aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'];
const studioShell=table=>`<html><head><title>展示会</title></head><body><script id="__NUXT_DATA__" type="application/json">${JSON.stringify(table)}</script></body></html>`;
test('Studio reads only the selected route and restricts the snapshot origin',()=>{
 assert.match(studioPageUrl(studioShell(studioTable),'https://expo.mappa.co.jp/'),/bf9fed39/);
 assert.match(studioPageUrl(studioShell(studioTable),'https://expo.mappa.co.jp/other'),/aaaaaaaa/);
 assert.equal(studioPageUrl(studioShell(studioTable),'https://expo.mappa.co.jp/missing'),undefined);
 const malicious=structuredClone(studioTable);malicious[6]='https://127.0.0.1/';assert.equal(studioPageUrl(studioShell(malicious),'https://expo.mappa.co.jp/'),undefined);
 assert.equal(studioPageUrl('<script id="__NUXT_DATA__">invalid</script>','https://expo.mappa.co.jp/'),undefined);
});
test('Studio text extraction ignores embeds, scripts and dynamic placeholders',()=>{
 const view={children:[{content:{type:'text',data:'会期'}},{content:{type:'text',data:'2026年9月16日～2026年12月7日<br>休館日あり'}},{content:{type:'iframe',data:'BAD'}},{content:{type:'text',data:'{{title}}'}},{content:{type:'richText',data:'<script>BAD</script><p>会場</p>'}}]};
 const html=studioTextHtml(view);assert.match(html,/会期/);assert.match(html,/<br>休館日/);assert.doesNotMatch(html,/BAD|script|\{\{/);
});
test('Studio enrichment fetches bounded public JSON and retains original metadata',async()=>{
 const urls=[];const mock=async(url,options)=>{urls.push(String(url));if(String(url).includes('dns-query'))return Response.json({Answer:[{type:1,data:'93.184.216.34'}]});if(String(url).startsWith('https://storage.googleapis.com/')){assert.equal(options.redirect,'manual');assert.ok(options.signal instanceof AbortSignal);return Response.json({children:[{content:{type:'text',data:'会期'}},{content:{type:'text',data:'2026年9月16日～2026年12月7日'}}]});}return new Response(studioShell(studioTable),{headers:{'content-type':'text/html'}})};
 const result=await readOfficialPage('https://expo.mappa.co.jp/',mock);assert.match(result.html,/<title>展示会/);assert.match(result.html,/2026年9月16日/);assert.equal(result.warning,undefined);assert.equal(urls.filter(u=>u.includes('page-views')).length,1);
});
test('Studio failure preserves title and gives a visible partial-read warning',async()=>{
 const mock=async url=>String(url).includes('dns-query')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):String(url).startsWith('https://storage.googleapis.com/')?new Response('',{status:404}):new Response(studioShell(studioTable),{headers:{'content-type':'text/html'}});
 const result=await readOfficialPage('https://expo.mappa.co.jp/',mock);assert.match(result.html,/<title>展示会/);assert.match(result.warning,/開催情報/);
});
test('related-page scope rejects a cross-origin redirect before fetching it',async()=>{
 const calls=[];const mock=async url=>{calls.push(String(url));return String(url).includes('dns-query')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):new Response(null,{status:302,headers:{location:'https://other.example.org/event'}});};
 await assert.rejects(readRemote('https://example.com/access',false,mock,'https://example.com'),/別サイト/);assert.ok(!calls.some(u=>u.startsWith('https://other.example.org')));
});

test('Studio rejects every redirect without following or reading its body',async t=>{
 const logs=[];t.mock.method(console,'warn',(...args)=>logs.push(args));
 const page={html:studioShell(studioTable),url:'https://expo.mappa.co.jp/'};
 for(const status of [300,301,302,303,304,305,307,308]){
  let calls=0,cancelled=false;
  const result=await enrichOfficialPage(page,async(url,options)=>{
   calls++;assert.equal(url,studioPageUrl(page.html,page.url));assert.equal(options.redirect,'manual');
   return {status,ok:false,headers:new Headers({'content-type':'application/json',location:'https://user:secret@evil.example/private'}),body:{cancel:async()=>{cancelled=true;},getReader(){assert.fail('redirect body must not be read');}}};
  });
  assert.equal(calls,1);assert.equal(cancelled,true);assert.equal(result.html,page.html);assert.ok(result.warning);
  assert.deepEqual(JSON.parse(logs.at(-1)[1]),{stage:'response',errorType:'HTTPRedirect',status});
 }
 assert.doesNotMatch(JSON.stringify(logs),/secret|evil|private/);
});
test('Studio refuses untrusted snapshot destinations without fetching',async()=>{
 for(const base of ['https://evil.example/','https://storage.googleapis.com.evil.example/studio-publish/projects/a/b/','https://storage.googleapis.com/other/a/b/','https://user:secret@storage.googleapis.com/studio-publish/projects/a/b/','https://storage.googleapis.com/studio-publish/projects/a/../','http://storage.googleapis.com/studio-publish/projects/a/b/']){
  const table=structuredClone(studioTable);table[6]=base;
  const page={html:studioShell(table),url:'https://expo.mappa.co.jp/'};
  assert.equal(await enrichOfficialPage(page,()=>assert.fail('invalid destination fetched')),page);
 }
});
test('Studio diagnostics identify failure stages without logging exception text or bodies',async t=>{
 const logs=[];t.mock.method(console,'warn',(...args)=>logs.push(args));
 const page={html:studioShell(studioTable),url:'https://expo.mappa.co.jp/'};
 const cases=[
  [()=>{throw new TypeError('secret-token');},'fetch','TypeError'],
  [()=>{throw new DOMException('secret-token','TimeoutError');},'fetch','TimeoutError'],
  [()=>{throw {name:'secret-token',message:'secret-token'};},'fetch','UnknownError'],
  [()=>new Response('secret-token',{status:403}),'response','HTTPStatus'],
  [()=>new Response('secret-token',{headers:{'content-type':'text/html'}}),'response','ContentType'],
  [()=>new Response('secret-token',{headers:{'content-type':'application/json','content-length':'1500001'}}),'body','Error'],
  [()=>new Response(new Uint8Array(1500001),{headers:{'content-type':'application/json'}}),'body','Error'],
  [()=>new Response('secret-token',{headers:{'content-type':'application/json'}}),'json','SyntaxError'],
 ];
 for(const [fetcher,stage,errorType] of cases){
  const result=await enrichOfficialPage(page,fetcher);assert.equal(result.html,page.html);assert.ok(result.warning);
  const log=JSON.parse(logs.at(-1)[1]);assert.equal(log.stage,stage);assert.equal(log.errorType,errorType);
 }
 assert.doesNotMatch(JSON.stringify(logs),/secret-token/);
});
test('HTML DNS protection remains active for Studio imports',async()=>{
 let calls=0;
 await assert.rejects(readOfficialPage('https://expo.mappa.co.jp/',async url=>{
  calls++;assert.ok(String(url).includes('dns-query'));return Response.json({Answer:[{type:1,data:'127.0.0.1'}]});
 }));
 assert.equal(calls,2);
});
