const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/goodsImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,URL});
test('OCR candidates normalize prices and skip ambiguous multiple prices',()=>{
 const rows=api.goodsFromText('マスコット\n１，９８０円\nステッカー 440円\n単品 500円 BOX 5000円','https://example.com/a.jpg','https://example.com');
 assert.equal(rows.length,2);assert.equal(rows[0].name,'マスコット');assert.equal(rows[0].price,'1980');assert.equal(rows[1].name,'ステッカー');assert.equal(api.goodsFromText('価格未定','','').length,0);
});
test('untrusted image links must use HTTPS without credentials',()=>{
 assert.equal(api.safeGoodsUrl('javascript:alert(1)','https://example.com'),'');assert.equal(api.safeGoodsUrl('https://user:password@example.com','https://example.com'),'');assert.equal(api.safeGoodsUrl('/goods.jpg','https://example.com/page'),'https://example.com/goods.jpg');
});
test('structured products preserve missing prices and deduplicate',()=>{
 const result={};const data={'@graph':[{'@type':'Product',name:'A',offers:{price:'1,200',priceCurrency:'JPY'},image:'/a.jpg'},{'@type':'Product',name:'B',offers:{price:20,priceCurrency:'USD'}},{'@type':'Product',name:'A',offers:{price:'1,200',priceCurrency:'JPY'},image:'/a.jpg'}]};
 class DOMParser {parseFromString(){return {querySelectorAll(selector){return selector==='img'?[]:[{textContent:JSON.stringify(data)}];}}}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/goodsImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result,URL,DOMParser});
 const output=result.extractGoods('','https://example.com');assert.equal(output.products.length,2);assert.equal(output.products[0].price,'1200');assert.equal(output.products[0].image,'https://example.com/a.jpg');assert.equal(output.products[1].price,'');
});
test('OCR malformed separators never turn 4,.620 into 620 yen',()=>{
 assert.equal(api.goodsFromText('BOX 4,.620 円','','').length,0);
 const result=api.goodsFromText('箸置き\n【単品】770 円','','');assert.equal(result[0].name,'箸置き 【単品】');
});
test('live park serialized goods are decoded without running scripts',()=>{
 const payload=[1,'abc:{"goodsItems":'+JSON.stringify([{title:'テスト',price:'単品 ¥770 BOX ¥4,620',category:'雑貨',limitText:'各１点',images:[{url:'/test.jpg'}]}])+'}'];
 const rows=api.parkGoods('<script>self.__next_f.push('+JSON.stringify(payload)+')</script>','https://chiikawapark-tokyo.jp/goods/');assert.equal(rows.length,2);assert.equal(rows[1].price,'4620');assert.equal(rows[1].variant,'BOX');assert.equal(rows[0].limit,'1');
});
test('発売日はドット区切りと日本語表記を受け付け、不正な日付を取り込まない',()=>{assert.equal(api.parseReleaseDate('2026.12.16[WED]ON SALE'),'2026-12-16');assert.equal(api.parseReleaseDate('2027年1月6日（水）'),'2027-01-06');assert.equal(api.parseReleaseDate('2027.2.30'),undefined);assert.equal(api.parseReleaseDate('発売日未定'),undefined);});
test('取得できない詳細の価格を捏造せず、一覧の発売日を残す',async()=>{const rows=[{name:'A',price:'',image:'',sourceUrl:'https://sp.utapri.com/shuffle_duet/duet/?u=duet01',releaseDate:'2026-12-16'}];const result=await api.enrichGoodsDetails(rows,async()=>{throw new Error('offline')});assert.equal(result[0].releaseDate,'2026-12-16');assert.equal(result[0].price,'');});
test('anniversary detail enrichment includes items beyond twelve and retains failed entries',async()=>{
 const rows=Array.from({length:19},(_,i)=>({name:`商品${i}`,price:'',image:'',sourceUrl:`https://15th.utapri.tv/goods/item${String(i+1).padStart(2,'0')}.html`}));
 const seen=[];const result=await api.enrichGoodsDetails(rows,async url=>{seen.push(url);throw Error('unavailable');});
 assert.equal(seen.length,19);assert.equal(result.length,19);assert.equal(result[18].name,'商品18');assert.equal(result[18].price,'');
});
