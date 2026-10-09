import { extractPageCandidates, fieldStates, safeSource, cleanText, type OfficialCandidate, type OfficialReport, type Field } from './officialCandidates';
export interface RemotePage {html:string;url:string;warning?:string;method?:'HTML'|'Studio'}
export type PageReader=(url:string,signal:AbortSignal,scopeOrigin?:string)=>Promise<RemotePage>;
export interface LinkCandidate {url:string;label:string;depth:number}
export const discoveryLimits={pages:8,depth:2,concurrency:2,milliseconds:45000};
export const httpPageReader:PageReader=async(url,signal,scopeOrigin)=>{
 const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,scopeOrigin}),signal});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('この環境ではURLを読み込めません。手入力は利用できます。');
 const data=await response.json();if(!response.ok)throw Error(data.error||'ページを取得できませんでした。');return data;
};
export function canonicalUrl(value:string,base:string){const safe=safeSource(value,base);if(!safe)return;const u=new URL(safe);for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/.test(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}
export function linkPriority(label:string,focus:Field|'all'|'tickets') {
 const specific=focus==='venue'?/アクセス|会場|access|venue/i:focus==='tickets'?/チケット|申込|抽選|ticket|entry/i:/Time|doorsOpen/.test(focus)?/日程|時間|公演|schedule|time/i:/startDate|endDate/.test(focus)?/日程|概要|開催|schedule|about/i:/出演|cast|artist/i;
 return (focus!=='all'&&specific.test(label)?100:0)+(/概要|詳細|日程|会場|アクセス|about|outline|access|schedule/i.test(label)?20:/チケット|申込|抽選|ticket|entry/i.test(label)?10:/物販|グッズ|注意|faq|goods/i.test(label)?5:0);
}
export function relatedLinks(html:string,url:string,depth:number,origin:string):LinkCandidate[]{
 const doc=new DOMParser().parseFromString(html,'text/html');const links=new Map<string,LinkCandidate>();
 for(const a of doc.querySelectorAll('a[href]')){const target=canonicalUrl(a.getAttribute('href')||'',url);if(!target||target===canonicalUrl(url,url)||new URL(target).origin!==origin)continue;const label=cleanText(a.textContent)+' '+new URL(target).pathname;if(!linkPriority(label,'all'))continue;if(/ログイン|購入する|logout|login|cart|checkout|privacy/i.test(label))continue;links.set(target,{url:target,label,depth});}
 return [...links.values()].slice(0,80);
}
export function relevance(root:OfficialCandidate[],page:OfficialCandidate[],label:string):'same'|'uncertain'|'unrelated'{
 const rootYears=new Set(root.flatMap(c=>[c.fields.startDate?.slice(0,4),...(c.fields.title?.match(/20\d{2}/g)||[])]).filter(Boolean));
 const years=page.flatMap(c=>[...(c.fields.title?.match(/20\d{2}/g)||[])]).concat(label.match(/20\d{2}/g)||[]);
 if(rootYears.size&&years.some(y=>!rootYears.has(y)))return 'unrelated';
 const norm=(s:string)=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
 const titles=root.map(c=>norm(c.fields.title||'')).filter(s=>s.length>=5);
 if(page.some(c=>titles.some(t=>norm(c.fields.title||'').includes(t))))return 'same';
 return 'uncertain';
}
/** One in-memory session: shared request budget and cache across field-specific searches. */
export class OfficialDiscovery {
 private queue:LinkCandidate[]=[];
 private attempted=new Set<string>();
 private pages=new Map<string,RemotePage>();
 private candidates:OfficialCandidate[]=[];
 private issues:OfficialReport['issues']=[];
 private origin='';
 private root:OfficialCandidate[]=[];
 private at=new Date().toISOString();
 private active=false;
 readonly input:string;
 private reader:PageReader;
 constructor(input:string,reader:PageReader=httpPageReader){this.input=input;this.reader=reader;}
 get primary(){return this.pages.values().next().value as RemotePage|undefined;}
 report():OfficialReport{return {version:1,requestedUrl:this.input,fetchedAt:this.at,candidates:[...this.candidates],issues:[...this.issues],visited:[...this.attempted],fields:fieldStates(this.candidates,this.issues)};}
 get remaining(){return Math.max(0,discoveryLimits.pages-this.attempted.size);}
 private async read(link:LinkCandidate,signal:AbortSignal){
  const key=canonicalUrl(link.url,link.url);if(!key||this.attempted.has(key)||this.pages.has(key)||this.attempted.size>=discoveryLimits.pages)return;
  this.attempted.add(key);
  if(/\.(pdf|png|jpe?g|webp)(?:\?|$)/i.test(key)){this.issues.push({url:key,status:'unsupported',reason:'PDF・画像内の文字は今回の読み取り対象外です。'});return;}
  try{
   const page=await this.reader(key,signal,this.origin||undefined);if(signal.aborted)throw Error('時間上限に達しました。');
   const resolved=canonicalUrl(page.url,key);if(!resolved)throw Error('取得先のURLを確認できませんでした。');
   if(this.origin&&new URL(resolved).origin!==this.origin)throw Error('別サイトへの転送があったため探索を中止しました。');
   if(this.pages.has(resolved))return;
   if(!this.origin)this.origin=new URL(resolved).origin;
   const candidates=extractPageCandidates(page.html,resolved,new Date().toISOString(),page.method||'HTML');
   const relation=link.depth===0?'same':relevance(this.root,candidates,link.label);
   this.pages.set(resolved,page);
   if(relation==='unrelated'){this.issues.push({url:resolved,status:'unsupported',reason:'別年度の情報として除外しました。'});return;}
   if(link.depth===0)this.root=candidates;
   for(const c of candidates){
    if(link.depth>0)c.confirmation=[c.confirmation,relation==='uncertain'?'同じイベントの情報か確認してください。':'関連ページの情報です。公演・会場・年度を確認してください。'].filter(Boolean).join(' ');
    if(!this.candidates.some(old=>old.id===c.id)&&this.candidates.length<80)this.candidates.push(c);
   }
   if(!page.warning&&candidates.every(c=>Object.keys(c.fields).every(k=>k==='title'))&&/<script\b/i.test(page.html)&&cleanText(new DOMParser().parseFromString(page.html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),'text/html').body.textContent).length<20)this.issues.push({url:resolved,status:'unsupported',reason:'本文が取得できません。JavaScript描画など、現在の方式に未対応の可能性があります。'});
   if(page.warning)this.issues.push({url:resolved,status:'unsupported',reason:page.warning});
   if(link.depth<discoveryLimits.depth){const links=relatedLinks(page.html,resolved,link.depth+1,this.origin);for(const next of links)if(!this.attempted.has(next.url)&&!this.queue.some(q=>q.url===next.url))this.queue.push(next);}
  }catch(e){this.issues.push({url:key,status:'error',reason:signal.aborted?'時間上限に達しました。取得済みの候補は残っています。':e instanceof Error?e.message:'取得に失敗しました。'});}
 }
 async search(focus:Field|'all'|'tickets'='all',external?:AbortSignal){
  if(this.active)return this.report();this.active=true;
  const controller=new AbortController();const abort=()=>controller.abort();external?.addEventListener('abort',abort,{once:true});if(external?.aborted)abort();
  const timer=setTimeout(abort,discoveryLimits.milliseconds);
  try{
   if(!this.attempted.size)await this.read({url:this.input,label:'入力URL',depth:0},controller.signal);
   let batches=0;
   while(!controller.signal.aborted&&this.queue.length&&this.remaining){
    const complete=focus==='all'?['title','startDate','venue'].every(k=>this.candidates.some(c=>c.fields[k as Field]))&&(this.candidates.some(c=>c.fields.startTime||c.fields.openingTime)):focus!=='tickets'&&this.candidates.some(c=>c.fields[focus]);
    if(complete&&(focus==='all'||batches>0))break;
    this.queue.sort((a,b)=>linkPriority(b.label,focus)-linkPriority(a.label,focus)||a.depth-b.depth||a.url.localeCompare(b.url));
    const batch=this.queue.splice(0,Math.min(discoveryLimits.concurrency,this.remaining));await Promise.all(batch.map(link=>this.read(link,controller.signal)));batches++;
   }
   return this.report();
  }finally{clearTimeout(timer);external?.removeEventListener('abort',abort);this.active=false;}
 }
}
