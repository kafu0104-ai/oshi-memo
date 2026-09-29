export type OfficialFields = Partial<Record<'title'|'startDate'|'endDate'|'venue'|'openingTime'|'closingTime',string>>;
export function extractOfficialFields(html:string):OfficialFields {
  const doc=new DOMParser().parseFromString(html,'text/html');
  const fields:OfficialFields={};
  const nodes:Record<string,unknown>[]=[];
  const walk=(value:unknown)=>{
    if(Array.isArray(value))value.forEach(walk);
    else if(value&&typeof value==='object'){
      const item=value as Record<string,unknown>;nodes.push(item);
      if(item['@graph'])walk(item['@graph']);
    }
  };
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script=>{try{walk(JSON.parse(script.textContent ?? ''));}catch{/* Ignore malformed structured data. */}});
  const events=nodes.filter(item=>[item['@type']].flat().some(type=>typeof type==='string'&&/Event$/.test(type)));
  const clean=(value:unknown)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,500):'';
  const date=(value:unknown)=>{const match=clean(value).match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);return match?.[1]??'';};
  if(events.length===1){
    const event=events[0];
    fields.title=clean(event.name);fields.startDate=date(event.startDate);fields.endDate=date(event.endDate);
    const location=event.location;
    fields.venue=typeof location==='string'?clean(location):location&&!Array.isArray(location)&&typeof location==='object'?clean((location as Record<string,unknown>).name):'';
  }
  if(!fields.title)fields.title=clean(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')||doc.querySelector('title')?.textContent);
  doc.querySelectorAll('script,style,nav,footer,header,noscript').forEach(node=>node.remove());
  const text=doc.body.textContent?.replace(/\s+/g,' ')??'';
  // Only labeled event dates; omitted end year/month inherit from the explicit start date.
  if(events.length<=1){
    const periods=[...text.matchAll(/(?:開催期間|開催日程|開催日時|開催日|会期)\s*[:：]?\s*([^※]{1,120})/g)].map(m=>eventPeriod(m[1])).filter((value):value is {startDate:string;endDate:string}=>!!value);
    const unique=[...new Map(periods.map(p=>[JSON.stringify(p),p])).values()];
    if(unique.length===1){fields.startDate ||= unique[0].startDate;fields.endDate ||= unique[0].endDate;}
    const venueLabels=[...doc.querySelectorAll('dt,th')].filter(node=>/^(開催場所|開催会場|会場)$/.test(clean(node.textContent)));
    if(venueLabels.length===1){const next=venueLabels[0].nextElementSibling;if(next&&/^(DD|TD)$/i.test(next.tagName))fields.venue ||= clean(next.textContent);}
    const eventHours=[...text.matchAll(/開催時間\s*[:：]?\s*(?:メイン会場\s*[:：]\s*)?([0-2]?\d):([0-5]\d)\s*[〜～~－–—-]\s*([0-2]?\d):([0-5]\d)/g)];
    const hours=eventHours.length?eventHours:[...text.matchAll(/(?:営業時間|開館時間)\s*[:：]?\s*(?:メイン会場\s*[:：]\s*)?([0-2]?\d):([0-5]\d)\s*[〜～~－–—-]\s*([0-2]?\d):([0-5]\d)/g)];
    if(hours.length===1&&Number(hours[0][1])<24&&Number(hours[0][3])<24){fields.openingTime=hours[0][1].padStart(2,'0')+':'+hours[0][2];fields.closingTime=hours[0][3].padStart(2,'0')+':'+hours[0][4];}
  }
  return Object.fromEntries(Object.entries(fields).filter(([,value])=>value));
}

export interface ImportedLottery {
  name:string; startDate:string; endDate:string;
  applicationStart:string; applicationEnd:string; resultDate:string;
}
export function lotteryRoundsFromText(text:string):ImportedLottery[] {
  const normalized=text.replace(/\s+/g,' ');
  const sections=[...normalized.matchAll(/第\s*[0-9０-９]+\s*期/g)];
  const dates=(value:string)=>[...value.matchAll(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
  return sections.flatMap((heading,index)=>{
    const block=normalized.slice(heading.index!,sections[index+1]?.index ?? normalized.length);
    const target=block.match(/抽選対象期間(.*?)応募期間/);
    const application=block.match(/応募期間(.*?)当選のご連絡/);
    const result=block.match(/当選のご連絡\s*[:：]?\s*(\d{4}年\s*\d{1,2}月\s*\d{1,2}日)/);
    if(!target||!application||!result)return [];
    const targetDates=dates(target[1]), applicationDates=dates(application[1]);
    if(targetDates.length!==2||applicationDates.length!==2)return [];
    const name=block.slice(0,block.indexOf('抽選対象期間')).trim().slice(0,150);
    return [{name,startDate:targetDates[0],endDate:targetDates[1],applicationStart:applicationDates[0],applicationEnd:applicationDates[1],resultDate:dates(result[1])[0]}];
  });
}
export function extractOfficialLotteries(html:string):ImportedLottery[] {
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,nav,footer,header,noscript').forEach(node=>node.remove());
  return lotteryRoundsFromText(doc.body.textContent ?? '');
}

/** Parse a labeled period; do not invent an initial year or invalid calendar dates. */
export function eventPeriod(value:string):{startDate:string;endDate:string}|undefined {
 const normalized=value.normalize('NFKC');
 const match=normalized.match(/^\s*(\d{4})[年/.\-]\s*(\d{1,2})[月/.\-]\s*(\d{1,2})日?\s*(?:[（(][^）)]*[）)])?\s*(?:[〜～~－–—・,-]\s*(?:(\d{4})[年/.\-]\s*)?(?:(\d{1,2})[月/.\-]\s*)?(\d{1,2})日?)?/);
 if(!match)return;
 const valid=(y:number,m:number,d:number)=>{const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;};
 const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
 const ey=Number(match[4]||y),em=Number(match[5]||m),ed=Number(match[6]||d);
 if(!valid(y,m,d)||!valid(ey,em,ed))return;
 const format=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const startDate=format(y,m,d),endDate=format(ey,em,ed);
 if(endDate<startDate)return;
 return {startDate,endDate};
}
