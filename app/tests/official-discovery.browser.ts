import {extractPageCandidates} from '../src/services/officialCandidates';
import {OfficialDiscovery,relatedLinks} from '../src/services/officialDiscovery';
const lines:string[]=[];let failed=0;
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function test(name:string,f:()=>unknown){try{await f();lines.push(`PASS ${name}`);}catch(e){failed++;lines.push(`FAIL ${name}: ${e}`);}document.querySelector('#results')!.textContent=lines.join('\n');}
const shell=(content:string,title='テスト展2026')=>`<html><head><title>${title}</title></head><body>${content}</body></html>`;
const at='2026-10-01T00:00:00Z';
await test('HTMLの複数公演は会場・日付・時刻を維持',()=>{
 const html=shell('<section><h2>東京公演</h2><p>10月17日（土）</p><p>会場：東京ホール</p><p>OPEN 17:00 START 18:00</p></section><section><h2>大阪公演</h2><p>10月24日（土）</p><p>会場：大阪ホール</p><p>16時開場 17時開演</p></section>');
 const c=extractPageCandidates(html,'https://example.com/',at);assert(c.some(x=>x.performance?.venue==='東京ホール'&&x.performance.date==='2026-10-17'&&x.performance.startTime==='18:00'),'東京 '+JSON.stringify(c));assert(c.some(x=>x.performance?.venue==='大阪ホール'&&x.performance.date==='2026-10-24'&&x.performance.startTime==='17:00'),'大阪');
});
await test('ラベルの異なる会場候補を破棄しない',()=>{const c=extractPageCandidates(shell('<dl><dt>会場</dt><dd>東京ホール</dd></dl><dl><dt>会場</dt><dd>大阪ホール</dd></dl>'),'https://example.com/',at);assert(c.some(c=>c.fields.venue==='東京ホール')&&c.some(c=>c.fields.venue==='大阪ホール'),'会場候補');});
await test('MAPPA型の会期全体を優先・時間を取得',()=>{const c=extractPageCandidates(shell('<div>会場</div><div>東京ミュージアム</div><div>会期</div><div>2026年9月16日～2026年12月7日<br>前期日程：2026年9月16日～2026年10月25日</div><div>開催時間</div><div>10:00～18:00（最終入場17:00）</div>'),'https://example.com/',at);assert(c.some(x=>x.fields.startDate==='2026-09-16'&&x.fields.endDate==='2026-12-07'&&x.fields.lastAdmission==='17:00'),'会期');});
await test('別ページ探索・重複なし・同時2件・再探索はキャッシュ共有',async()=>{
 const calls:string[]=[];let active=0,max=0;
 const d=new OfficialDiscovery('https://example.com/',async url=>{calls.push(url);active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return {url,html:url==='https://example.com/'?shell('<a href="/access">アクセス</a><a href="/about">開催概要</a><a href="/access#map">会場</a><a href="https://other.example/access">アクセス</a>'):url.endsWith('/access')?shell('<dt>会場</dt><dd>東京ホール</dd><a href="/schedule">公演日程</a>'):shell('<dt>会期</dt><dd>2026年10月17日</dd><p>開演18:00</p>')};});
 const r=await d.search();assert(r.candidates.some(c=>c.fields.venue==='東京ホール'),'下層会場');assert(new Set(calls).size===calls.length,'重複');assert(max<=2,'並列');await d.search('venue');assert(new Set(calls).size===calls.length,'再探索重複');assert(!calls.some(x=>x.includes('other.example')),'外部');
});
await test('8ページ上限・2階層上限',async()=>{const calls:string[]=[];const d=new OfficialDiscovery('https://example.com/',async url=>{calls.push(url);const depth=new URL(url).pathname.split('/').filter(Boolean).length;return {url,html:shell(Array.from({length:10},(_,i)=>`<a href="${new URL(url).pathname}${depth?'/':''}access${i}">会場案内</a>`).join(''))};});await d.search('performers');assert(calls.length===8,'8ページ');assert(calls.every(u=>new URL(u).pathname.split('/').filter(Boolean).length<=2),'2階層');});
await test('別年度ページは除外',async()=>{const d=new OfficialDiscovery('https://example.com/',async url=>({url,html:url.endsWith('/old')?shell('<dt>会場</dt><dd>古い会場</dd>','テスト展2025'):shell('<a href="/old">開催概要2025</a>')}));const r=await d.search();assert(!r.candidates.some(c=>c.fields.venue==='古い会場'),'過年度除外');});
await test('PDFは取得せず未対応理由を保持',async()=>{let n=0;const d=new OfficialDiscovery('https://example.com/',async url=>{n++;return {url,html:shell('<a href="/access.pdf">会場案内PDF</a>')}});const r=await d.search('venue');assert(n===1&&r.issues.some(i=>i.status==='unsupported'),'PDF');});
await test('外部リンク・ハッシュ・ログインは探索しない',()=>{const links=relatedLinks(shell('<a href="#access">会場</a><a href="https://evil.example/access">会場</a><a href="/login">チケットログイン</a><a href="/access">会場</a>'),'https://example.com/',1,'https://example.com');assert(links.length===1&&links[0].url.endsWith('/access'),'URL制限');});
document.querySelector('#results')!.textContent+=`\n完了：${lines.length-failed}/${lines.length} 成功`;
await test('同一ページへの転送後URLは再取得しない',async()=>{const calls:string[]=[];const d=new OfficialDiscovery('https://example.com/start',async url=>{calls.push(url);return {url:'https://example.com/',html:shell('<a href="/">開催概要</a><a href="/access">アクセス</a>')}});await d.search();assert(!calls.includes('https://example.com/'),'転送後URLの重複');});
await test('年が不明な公演と受付時刻を未確定候補として保持',()=>{const c=extractPageCandidates(shell('<section><h2>東京公演</h2><p>10月17日</p><p>会場：東京ホール</p><p>OPEN 17:00 START 18:00</p></section><p>受付開始 10:00</p>','年不明のライブ'),'https://example.com/',at);assert(c.some(x=>x.unresolved?.startDate?.includes('10月17日')),'年不明候補');assert(!c.some(x=>x.performance),'年を推測しない');assert(c.some(x=>x.notices?.some(n=>n.label==='受付開始'&&n.value==='10:00')),'受付時刻');});
await test('開催開始日の根拠は実際の会期を含む',()=>{const c=extractPageCandidates(shell('<p>'+('紹介文。'.repeat(120))+'</p><dt>会期</dt><dd>2026年10月17日</dd>'),'https://example.com/',at);assert(c.some(x=>x.evidence.startDate?.excerpt.includes('2026年10月17日')),'根拠');});
document.querySelector('#results')!.textContent=lines.join('\n')+`\n完了：${lines.length-failed}/${lines.length} 成功`;
await test('同じ会場の複数日程でも各日の時刻を保持',()=>{const c=extractPageCandidates(shell('<section><h2>東京公演</h2><p>会場：東京ホール</p><p>2026年10月17日 開場17:00 開演18:00</p><p>2026年10月18日 開場16:00 開演17:00</p></section>'),'https://example.com/',at);assert(c.some(x=>x.performance?.date==='2026-10-17'&&x.performance.startTime==='18:00'),'1日目');assert(c.some(x=>x.performance?.date==='2026-10-18'&&x.performance.startTime==='17:00'),'2日目');});
document.querySelector('#results')!.textContent=lines.join('\n')+`\n完了：${lines.length-failed}/${lines.length} 成功`;

await test('アクセス案内の郵便番号・電話番号・番地を日程候補にしない',()=>{const c=extractPageCandidates(shell('<h2>メイン会場(池袋・サンシャインシティ)までのアクセス</h2><p>〒170-0013 東京都豊島区東池袋3-1-1</p><p>03-3989-3331</p>'),'https://example.com/access',at);assert(!c.some(x=>x.unresolved?.startDate||x.performance||x.fields.venue),'住所を公演と誤認');});
document.querySelector('#results')!.textContent=lines.join('\n')+`\n完了：${lines.length-failed}/${lines.length} 成功`;
