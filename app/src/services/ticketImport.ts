import type { TicketReception } from '../types/Ticket';

export type ReceptionCandidate = Pick<TicketReception,'name'|'receptionType'|'applicationStartDate'|'applicationStartTime'|'applicationDeadlineDate'|'applicationDeadlineTime'|'resultDate'|'resultTime'> & {
  mode: '現地公演' | 'ライブビューイング';
  bookingUrl?: string;
  note?: string;
};

function dateTimes(text:string) {
  return [...text.normalize('NFKC').matchAll(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*\([^)]*\))?\s*(?:(\d{1,2}):(\d{2}))?/g)].flatMap(m=>{
    const y=Number(m[1]),month=Number(m[2]),day=Number(m[3]),d=new Date(Date.UTC(y,month-1,day));
    if(d.getUTCFullYear()!==y||d.getUTCMonth()!==month-1||d.getUTCDate()!==day|| (m[4] && (Number(m[4])>23 || Number(m[5])>59)))return [];
    return [{date:`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`,time:m[4]?`${m[4].padStart(2,'0')}:${m[5]}`:undefined}];
  });
}

/** Only dates under the application/result labels belong to a lottery reception. */
export function receptionFromText(text:string,mode:ReceptionCandidate['mode']):ReceptionCandidate|undefined {
  const normalized=text.normalize('NFKC').trim();
  const heading=normalized.match(/^▼\s*([^\n]+)/)?.[1]?.trim();
  if(!heading)return;
  const lottery=/抽選|プレオーダー/.test(heading);
  if(!lottery&&!/一般販売|先着/.test(heading))return;
  const labelBlock=(label:string)=>normalized.match(new RegExp('[【\\[]'+label+'[】\\]]\\s*([\\s\\S]*?)(?=[【\\[]|$)'))?.[1]||'';
  const application=lottery?dateTimes(labelBlock('(?:抽選申込期間|申込期間|受付期間)')):dateTimes(normalized.slice(normalized.indexOf('\n')+1));
  // Venue-specific windows require separate choices; never flatten them together.
  if(!lottery&&/[【\[].*公演[】\]]/.test(normalized))return;
  if((lottery&&application.length!==2)||(!lottery&&(application.length<1||application.length>2)))return;
  const [start,end]=application;
  if(end && `${end.date}T${end.time||'23:59'}`<`${start.date}T${start.time||'00:00'}`)return;
  const resultBlock=labelBlock('(?:抽選結果発表|当落発表|結果発表)');
  const results=dateTimes(resultBlock);
  if(lottery&&results.length!==1)return;
  const result=results[0];
  const requirements=normalized.split('\n').map(line=>line.trim()).filter(line=>/シリアルコード/.test(line)&&!line.startsWith('http')).join('\n');
  const note=[requirements,result&&/頃/.test(resultBlock)?`当落発表は${result.time || result.date}頃の予定です。`: ''].filter(Boolean).join('\n');
  return {name:heading,mode,receptionType:lottery?'lottery':'general',applicationStartDate:start.date,applicationStartTime:start.time,
    applicationDeadlineDate:end?.date,applicationDeadlineTime:end?.time,resultDate:result?.date,resultTime:result?.time,note:note||undefined};
}

export function extractTicketReceptions(html:string):ReceptionCandidate[] {
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,nav,footer,header,noscript').forEach(node=>node.remove());
  doc.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
  let mode:ReceptionCandidate['mode']='現地公演';
  const candidates:ReceptionCandidate[]=[];
  for(const node of doc.querySelectorAll('p,h2,h3,h4')){
    const text=(node.textContent||'').trim();
    if(/^ライブ[・\s]?ビューイング(?:情報)?$/.test(text)){mode='ライブビューイング';continue;}
    const candidate=receptionFromText(text,mode);if(!candidate)continue;
    const href=node.querySelector('a[href]')?.getAttribute('href');
    if(href){try{const url=new URL(href);if(url.protocol==='https:'&&!url.username&&!url.password)candidate.bookingUrl=url.href;}catch{/* Untrusted or relative link stays unset. */}}
    candidates.push(candidate);
  }
  return [...new Map(candidates.map(c=>[JSON.stringify(c),c])).values()];
}
