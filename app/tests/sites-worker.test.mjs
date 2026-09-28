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
