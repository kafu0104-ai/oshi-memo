import { extractOfficialFields, extractOfficialLotteries, extractOfficialPerformances, type OfficialFields, type ImportedLottery, type ImportedPerformance } from './officialImport';

export type Field = keyof OfficialFields;
export const fieldLabels: Record<Field,string> = {title:'イベント名',startDate:'開催開始日',endDate:'開催終了日',venue:'会場・住所',performers:'出演者',doorsOpen:'開場時刻',startTime:'開演・開始時刻',endTime:'終了時刻',openingTime:'営業開始時刻',closingTime:'営業終了時刻',lastAdmission:'最終入場時刻'};
export type ImportStatus = 'found'|'notFound'|'ambiguous'|'unsupported'|'notApplied'|'error';
export interface Evidence {value:string; sourceUrl:string; excerpt:string; fetchedAt:string; method:'HTML'|'JSON-LD'|'Studio'; confirmation?:string}
export interface OfficialCandidate {id:string; sourceUrl:string; label:string; fields:OfficialFields; evidence:Partial<Record<Field,Evidence>>; confirmation?:string; detailUrl?:string; performance?:ImportedPerformance; lotteries:ImportedLottery[]; unresolved?:Partial<Record<Field,string>>; notices?:Array<Evidence & {label:string}>}
export interface PageIssue {url:string; status:'error'|'unsupported'; reason:string}
export interface OfficialReport {version:1; requestedUrl:string; fetchedAt:string; candidates:OfficialCandidate[]; issues:PageIssue[]; visited:string[]; fields:Record<Field,{status:ImportStatus; reason?:string; applied?:Evidence[]}>}
export const cleanText=(value:unknown)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,1000):'';
export function safeSource(value:string,base:string):string|undefined {try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password||u.port)return;u.hash='';return u.href;}catch{return;}}
export function periodCandidate(input:string, years:number[]=[]): {startDate:string;endDate:string;confirmation?:string}|undefined {
 const s=input.normalize('NFKC').trim();
 const m=s.match(/^(?:(\d{4})[年/.\-]\s*)?(\d{1,2})[月/.\-]\s*(\d{1,2})日?\s*(?:\([^)]*\))?\s*(?:[~〜～–—・,-]\s*(?:(\d{4})[年/.\-]\s*)?(?:(\d{1,2})[月/.\-]\s*)?(\d{1,2})日?)?/);
 if(!m)return;
 const unique=[...new Set(years)];const y=Number(m[1]||(unique.length===1?unique[0]:0));if(!y)return;
 const month=Number(m[2]),day=Number(m[3]),em=Number(m[5]||month),ed=Number(m[6]||day);
 let ey=Number(m[4]||y),confirmation=m[1]?undefined:`年の省略を開催年 ${y} 年で補っています。確認してください。`;
 if(!m[4] && m[5] && em<month){ey=y+1;confirmation='終了年が省略されています。翌年の日程として確認してください。';}
 const valid=(y:number,m:number,d:number)=>{const t=new Date(Date.UTC(y,m-1,d));return y>=1900&&y<=2199&&t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;};
 if(!valid(y,month,day)||!valid(ey,em,ed))return;
 const format=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const startDate=format(y,month,day),endDate=format(ey,em,ed);if(endDate<startDate)return;
 return {startDate,endDate,confirmation};
}
export function labeledTimes(input:string, label:string):string[] {
 const text=input.normalize('NFKC');const clock='([0-2]?\\d)(?::([0-5]\\d)|時(?:\\s*([0-5]?\\d)分)?)';
 const labels='(?:開場|開演|OPEN|START|受付開始|当落発表|抽選結果発表|当選発表)';
 const precededByBareTime=(prefix:string)=>new RegExp(`${clock}\\s*$`).test(prefix)&&!new RegExp(`${labels}\\s*[:：]?\\s*${clock}\\s*$`,'i').test(prefix);
 const precededByBareLabel=(prefix:string)=>new RegExp(`${labels}\\s*[:：]?\\s*$`,'i').test(prefix)&&!new RegExp(`${clock}\\s*${labels}\\s*$`,'i').test(prefix);
 const forward=[...text.matchAll(new RegExp(`(?:${label})\\s*[:：]?\\s*${clock}`,'gi'))].filter(m=>!precededByBareTime(text.slice(0,m.index)));
 const backward=[...text.matchAll(new RegExp(`${clock}\\s*(?:${label})`,'gi'))].filter(m=>!precededByBareLabel(text.slice(0,m.index)));
 const matches=[...forward,...backward];
 return [...new Set(matches.filter(m=>Number(m[1])<24).map(m=>`${m[1].padStart(2,'0')}:${(m[2]||m[3]||'0').padStart(2,'0')}`))];
}
const timeLabels:Partial<Record<Field,string>>={doorsOpen:'開場|\\bOPEN\\b',startTime:'開演|\\bSTART\\b',endTime:'終演|終了時刻'};
function makeCandidate(fields:OfficialFields,label:string,url:string,at:string,method:Evidence['method'],excerpt:string,confirmation?:string):OfficialCandidate {
 const evidence:OfficialCandidate['evidence']={};
 const anchors:Partial<Record<Field,RegExp>>={startDate:/会期|開催期間|開催日|公演日|日程/,endDate:/会期|開催期間|開催日|公演日|日程/,venue:/会場|開催場所|所在地/,openingTime:/開催時間|営業時間|開館時間/,closingTime:/開催時間|営業時間|開館時間/,lastAdmission:/最終入場|最終入館/,performers:/出演|キャスト|CAST/i};
 for(const [key,value] of Object.entries(fields))if(value){let index=excerpt.indexOf(value);if(index<0)index=excerpt.search(anchors[key as Field]||/$^/);const proof=excerpt.slice(Math.max(0,index-30),Math.max(0,index-30)+300);evidence[key as Field]={value,sourceUrl:url,excerpt:proof,fetchedAt:at,method,confirmation};}
 return {id:JSON.stringify([url,label,fields]),sourceUrl:url,label,fields,evidence,confirmation,lotteries:[]};
}
function isoTime(value:unknown){const m=cleanText(value).match(/T([0-2]\d):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)?$/);return m&&Number(m[1])<24 ? `${m[1]}:${m[2]}`:undefined;}
export function structuredCandidates(values:unknown[],url:string,at:string):OfficialCandidate[] {
 const nodes:Record<string,unknown>[]=[];const seen=new Set<unknown>();
 const walk=(v:unknown,depth=0)=>{if(!v||typeof v!=='object'||depth>20||seen.has(v)||nodes.length>=100)return;seen.add(v);if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return;}const n=v as Record<string,unknown>;if([n['@type']].flat().some(t=>typeof t==='string'&&/Event$/.test(t)))nodes.push(n);for(const key of ['@graph','subEvent','subEvents','itemListElement','item'])walk(n[key],depth+1);};values.forEach(v=>walk(v));
 return nodes.slice(0,40).map(n=>{
  const location=n.location as Record<string,unknown>|string|undefined;const loc=location&&typeof location==='object'&&!Array.isArray(location)?location:undefined;
  const address=loc?.address;const a=address&&typeof address==='object'?address as Record<string,unknown>:undefined;
  const addressText=typeof address==='string'?address:a?['addressRegion','addressLocality','streetAddress'].map(k=>cleanText(a[k])).filter(Boolean).join(''):'';
  const start=periodCandidate(cleanText(n.startDate).split('T')[0]),end=periodCandidate(cleanText(n.endDate).split('T')[0]);
  const performers=[n.performer].flat().map(p=>typeof p==='string'?p:p&&typeof p==='object'?cleanText((p as Record<string,unknown>).name):'').filter(Boolean).join('、');
  const fields:OfficialFields={};const put=(k:Field,v:string|undefined)=>{if(v)fields[k]=v;};
  put('title',cleanText(n.name));put('startDate',start?.startDate);put('endDate',end?.endDate);put('venue',[typeof location==='string'?location:cleanText(loc?.name),addressText].filter(Boolean).join(' ／ '));put('performers',performers);put('startTime',isoTime(n.startDate));put('endTime',isoTime(n.endDate));
  const offset=cleanText(n.startDate).match(/(Z|[+-]\d\d:\d\d)$/)?.[1];
  const confirmation=[nodes.length>1?'複数イベントが掲載されています。登録する公演を確認してください。':'',offset&&offset!=='+09:00'?`原文の時刻帯は ${offset} です。日本時間への換算はしていません。確認してください。`:''].filter(Boolean).join(' ')||undefined;
  const c=makeCandidate(fields,fields.title||'構造化されたイベント',url,at,'JSON-LD',JSON.stringify(n).slice(0,300),confirmation);
  c.detailUrl=typeof n.url==='string'?safeSource(n.url,url):undefined;
  if(fields.startDate&&fields.venue&&(!fields.endDate||fields.endDate===fields.startDate))c.performance={date:fields.startDate,venue:fields.venue,startTime:fields.startTime,endTime:fields.endTime,genre:n['@type']==='MusicEvent'?'live':n['@type']==='TheaterEvent'?'stage':n['@type']==='ScreeningEvent'?'movie':undefined};
  return c;
 });
}
export function extractPageCandidates(html:string,url:string,at:string,method:Evidence['method']='HTML'):OfficialCandidate[] {
 const doc=new DOMParser().parseFromString(html,'text/html');const data:unknown[]=[];
 for(const node of doc.querySelectorAll('script[type="application/ld+json"]'))try{data.push(JSON.parse(node.textContent||''));}catch{/* malformed data does not suppress HTML */}
 const structured=structuredCandidates(data,url,at);
 const legacy=extractOfficialFields(html),shows=extractOfficialPerformances(html),lotteries=extractOfficialLotteries(html);
 doc.querySelectorAll('script,style,nav,footer,header,noscript').forEach(n=>n.remove());doc.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));doc.querySelectorAll('p,div,dt,dd,th,td,h1,h2,h3,h4').forEach(n=>n.append('\n'));
 const title=legacy.title||cleanText(doc.querySelector('h1')?.textContent);
 // Only an explicitly event-scoped year; never use the computer's current year or copyright.
 const yearText=[title,legacy.startDate||'',legacy.endDate||'',...structured.map(c=>c.fields.startDate||''),...Array.from(doc.querySelectorAll('h1,h2')).map(n=>cleanText(n.textContent))].join(' ');
 const years=[...yearText.matchAll(/\b(20\d{2})\b/g)].map(m=>Number(m[1]));
 const groups:OfficialCandidate[]=[];
 for(const show of shows){const c=makeCandidate({startDate:show.date,endDate:show.date,venue:show.venue,doorsOpen:show.doorsOpen,startTime:show.startTime},`${show.date} ${show.venue}`,url,at,method,`${show.date} ${show.venue} 開場 ${show.doorsOpen||''} 開演 ${show.startTime||''}`);c.performance={...show,genre:"live"};groups.push(c);}
 const blocks=[...doc.querySelectorAll('section,article,li,.eventWrap')].filter(n=>!n.querySelector('section,article,li,.eventWrap'));
 // Heading + siblings is common on tour pages without cards.
 for(const heading of doc.querySelectorAll('h2,h3,h4')){const holder=doc.createElement('section');holder.append(heading.cloneNode(true));let next=heading.nextElementSibling;let count=0;while(next&&!/^H[1-4]$/.test(next.tagName)&&count++<12){holder.append(next.cloneNode(true));next=next.nextElementSibling;}blocks.push(holder);}
 for(const block of blocks){
  const text=block.textContent||'';if(/申込期間|応募期間|当落|受付期間|販売期間/.test(text))continue;
  const rows=[...text.matchAll(/^(?:\s*)(?:(?:20\d{2})[年/.\-]\s*)?\d{1,2}[月/.\-]\d{1,2}日?/gm)];
  if(rows.length>1){
   const venues=[...new Set([...text.matchAll(/(?:会場|開催場所)\s*[:：]?\s*([^\n]+)/g)].map(m=>cleanText(m[1])))];
   for(let i=0;i<Math.min(rows.length,30)&&blocks.length<200;i++){
    const part=doc.createElement('section'),heading=block.querySelector('h2,h3,h4');if(heading)part.append(heading.cloneNode(true));
    const p=doc.createElement('p');p.textContent=text.slice(rows[i].index,rows[i+1]?.index).trim();part.append(p);
    if(venues.length===1&&!/(?:会場|開催場所)/.test(p.textContent)){const v=doc.createElement('p');v.textContent='\n会場：'+venues[0];part.append(v);}
    blocks.push(part);
   }
   continue;
  }

  // Do not interpret a postal code, telephone number or street address as a date.
  const firstDate=text.match(/(?<![\d/.\-])(?:20\d{2}[年/.\-])?\d{1,2}[月/.\-]\d{1,2}日?(?![\d/.\-])/);
  const dateText=text.match(/(?:開催日(?:程)?|公演日|日程)\s*[:：]?\s*([^\n]+)/)?.[1]||(firstDate?text.slice(firstDate.index).split('\n')[0]:undefined);
  const period=dateText?periodCandidate(dateText,years):undefined;
  const label=cleanText(block.querySelector('h2,h3,h4')?.textContent);
  const venue=text.match(/(?:会場|開催場所)\s*[:：]?\s*([^\n]+)/)?.[1]||cleanText(block.querySelector('.place-txt')?.textContent);
  const doors=labeledTimes(text,timeLabels.doorsOpen!),starts=labeledTimes(text,timeLabels.startTime!);
  // A city label is not a venue; retain it as a label without inventing a hall.
  if(!period&&dateText&&(venue||label)){const c=makeCandidate(venue?{venue:cleanText(venue)}:{},label||'日程を確認する候補',url,at,method,cleanText(text),'日付の年・表記を確定できません。原文を確認してください。');c.unresolved={startDate:dateText};groups.push(c);continue;}
  if(!period||period.startDate!==period.endDate||(!venue&&!label)||(!doors.length&&!starts.length))continue;
  const fields:OfficialFields={startDate:period.startDate,endDate:period.endDate};if(venue)fields.venue=cleanText(venue);if(doors.length===1)fields.doorsOpen=doors[0];if(starts.length===1)fields.startTime=starts[0];
  const confirmation=period.confirmation||(doors.length>1||starts.length>1?'同じ区画に複数時刻があります。公演ごとの時刻を確認してください。':undefined);
  if(doors.length>1||starts.length>1)continue; // individual times are retained below without making up pairings
  const c=makeCandidate(fields,label||venue||'公演候補',url,at,method,cleanText(text),confirmation);if(venue)c.performance={date:period.startDate,venue:cleanText(venue),doorsOpen:fields.doorsOpen,startTime:fields.startTime};groups.push(c);
 }
 const distinct=[...new Map(groups.map(c=>[JSON.stringify(c.fields),c])).values()];
 const base:OfficialFields={...legacy};
 for(const k of Object.keys(base) as Field[])if(structured.some(c=>c.fields[k]===base[k]))delete base[k];
 if(distinct.length||structured.length>1){for(const key of ['startDate','endDate','venue','doorsOpen','startTime','endTime'] as Field[])delete base[key];}
 const candidates:OfficialCandidate[]=[...structured,...distinct];
 if(Object.keys(base).length){const c=makeCandidate(base,title||'ページの基本情報',url,at,method,(doc.body.textContent||'').replace(/\s+/g,' ').trim());if(c.evidence.title)c.evidence.title.excerpt=title;
  c.lotteries=lotteries.filter(r=>r.applicationEnd>=at.slice(0,10));candidates.push(c);}
 // Keep competing labelled values, not only the single result accepted by the legacy parser.
 for(const node of doc.querySelectorAll('dt,th,p,div,span,h2,h3,h4')){
  const label=cleanText(node.textContent);const next=node.nextElementSibling;if(!next)continue;const value=cleanText(next.textContent);let fields:OfficialFields={};let confirmation:string|undefined;
  if(/^(開催期間|開催日程|開催日|公演日程|日程|会期)$/.test(label)){const p=periodCandidate(value,years);if(p){fields={startDate:p.startDate,endDate:p.endDate};confirmation=p.confirmation;}else if(/\d{1,2}月\d{1,2}日/.test(value)){const c=makeCandidate({},`${title}・年を確認する日程`,url,at,method,`${label} ${value}`,'開催年を特定できません。原文を確認して手入力してください。');c.unresolved={startDate:value};candidates.push(c);}}
  if(/^(会場|開催場所|開催会場)$/.test(label)&&value)fields={venue:value};
  if(Object.keys(fields).length&&!candidates.some(c=>Object.entries(fields).every(([k,v])=>c.fields[k as Field]===v)))candidates.push(makeCandidate(fields,`${title}・${label}`,url,at,method,`${label} ${value}`,confirmation));
 }
 if(!distinct.length&&structured.length<=1){
  const text=doc.body.textContent||'';
  for(const [key,label] of Object.entries(timeLabels))for(const value of labeledTimes(text,label!))if(!candidates.some(c=>c.fields[key as Field]===value))candidates.push(makeCandidate({[key]:value},`${title}・${fieldLabels[key as Field]}`,url,at,method,`${fieldLabels[key as Field]} ${value}`,labeledTimes(text,label!).length>1?'複数の時刻が見つかりました。対象の公演を確認してください。':undefined));
 }
 const notices:NonNullable<OfficialCandidate['notices']>=[];
 for(const node of doc.querySelectorAll('p,dd,li')){const text=cleanText(node.textContent);if(text.length>600)continue;for(const [label,pattern]of [['受付開始','受付開始'],['当落発表','当落発表|抽選結果発表|当選発表']] as const)for(const value of labeledTimes(text,pattern))if(!notices.some(n=>n.label===label&&n.value===value&&n.excerpt===text))notices.push({label,value,sourceUrl:url,excerpt:text.slice(0,300),fetchedAt:at,method});}
 if(notices.length){const c=makeCandidate({},'受付・抽選の時刻',url,at,method,'');c.notices=notices.slice(0,20);candidates.push(c);}
 return candidates.filter(c=>c.notices||c.unresolved||c.lotteries.length||Object.values(c.fields).some(Boolean)).slice(0,40);
}
export function fieldStates(candidates:OfficialCandidate[],issues:PageIssue[]=[]):OfficialReport['fields'] {
 return Object.fromEntries((Object.keys(fieldLabels) as Field[]).map(key=>{const values=new Set(candidates.map(c=>c.fields[key]).filter(Boolean));const uncertain=candidates.some(c=>(c.fields[key]&&c.confirmation)||c.unresolved?.[key]);const status:ImportStatus=values.size>1||uncertain?'ambiguous':values.size?'notApplied':issues.some(i=>i.status==='error')?'error':issues.length?'unsupported':'notFound';return [key,{status,reason:status==='notFound'?'探索したページには、対応する書式の情報が見つかりませんでした。':status==='ambiguous'?'候補・出典を確認して選んでください。':status==='error'?'一部のページを取得できませんでした。':status==='unsupported'?'PDF・画像・未対応の動的表示などは読み取れません。':undefined}];})) as OfficialReport['fields'];
}
