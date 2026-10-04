export type OfficialFields = Partial<Record<'performers'|'title'|'startDate'|'endDate'|'venue'|'openingTime'|'closingTime'|'lastAdmission'|'doorsOpen'|'startTime',string>>;
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
  doc.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
  const performerBlocks = [...doc.querySelectorAll('p,div,dd,section')].map(node=>performersFromText(node.textContent || '')).filter(Boolean);
  for(const node of doc.querySelectorAll('dt,th,h2,h3,h4')){
    if(/^[＜<【\[]?\s*(?:出演者|出演|キャスト|CAST)\s*[＞>】\]]?$/i.test((node.textContent||'').trim()) && node.nextElementSibling){
      const value=performersFromText('出演者\n'+node.nextElementSibling.textContent);if(value)performerBlocks.push(value);
    }
  }
  const uniquePerformers=[...new Set(performerBlocks)];
  if(uniquePerformers.length===1)fields.performers=uniquePerformers[0];
  const lines=doc.body.textContent??'';
  const text=lines.replace(/[〖〗【】]/g,' ').replace(/\s+/g,' ');
  // Only labeled event dates; omitted end year/month inherit from the explicit start date.
  if(events.length<=1){
    const periods=[...text.matchAll(/(?:開催期間|開催日程|開催日時|開催日|公演日程|公演日|日程|会期)\s*[:：]?\s*([^※]{1,120})/g)].map(m=>eventPeriod(m[1])).filter((value):value is {startDate:string;endDate:string}=>!!value);
    const unique=[...new Map(periods.map(p=>[JSON.stringify(p),p])).values()];
    if(unique.length===1){fields.startDate ||= unique[0].startDate;fields.endDate ||= unique[0].endDate;}
    // Sites use both definition tables and ordinary sibling spans for access details.
    const labeledValue=(pattern:RegExp)=>{
      const values=[...doc.querySelectorAll('dt,th,span,p,div,label')].filter(node=>pattern.test(clean(node.textContent))).flatMap(node=>{
        const next=node.nextElementSibling;
        if(!next || (/^(DT|TH)$/i.test(node.tagName)&&!/^(DD|TD)$/i.test(next.tagName)))return [];
        const copy=next.cloneNode(true) as Element;
        copy.querySelectorAll('a').forEach(link=>{if(/(?:map|地図)/i.test(link.textContent??''))link.remove();});
        copy.querySelectorAll('br').forEach(br=>br.replaceWith(' '));
        const value=clean(copy.textContent);return value?[value]:[];
      });
      const unique=[...new Set(values)];return unique.length===1?unique[0]:'';
    };
    const labeledVenues=[...lines.matchAll(/[〖【]\s*(?:会場|開催会場|開催場所)\s*[〗】]\s*([^\n〖【]{1,200})/g)].map(match=>clean(match[1]));
    const uniqueVenues=[...new Set(labeledVenues)];
    const venue=(uniqueVenues.length===1?uniqueVenues[0]:'') || labeledValue(/^(開催場所|開催会場|会場|施設名|店舗名)$/);
    const address=labeledValue(/^(住所|所在地)$/);
    fields.venue ||= [venue,address].filter(Boolean).join(' ／ ');
    const admission=[...text.normalize('NFKC').matchAll(/最終(?:入場|入館)(?:時刻|時間)?\s*[:：]?\s*([0-2]?\d)(?::|時)\s*([0-5]\d)分?/g)]
      .filter(match=>Number(match[1])<24).map(match=>match[1].padStart(2,'0')+':'+match[2]);
    if(new Set(admission).size===1)fields.lastAdmission=admission[0];
    for(const [label,key] of [['開場','doorsOpen'],['開演','startTime']] as const){
      const values=[...text.normalize('NFKC').matchAll(new RegExp(label+'\\s*[:：]?\\s*([0-2]?\\d):([0-5]\\d)','g'))]
        .filter(match=>Number(match[1])<24).map(match=>match[1].padStart(2,'0')+':'+match[2]);
      if(new Set(values).size===1)fields[key]=values[0];
    }
    const eventHours=[...text.matchAll(/開催時間\s*[:：]?\s*(?:メイン会場\s*[:：]\s*)?([0-2]?\d):([0-5]\d)\s*[〜～~－–—-]\s*([0-2]?\d):([0-5]\d)/g)];
    const hours=eventHours.length?eventHours:[...text.matchAll(/(?:営業時間|開館時間)\s*[:：]?\s*(?:メイン会場\s*[:：]\s*)?([0-2]?\d):([0-5]\d)\s*[〜～~－–—-]\s*([0-2]?\d):([0-5]\d)/g)];
    if(hours.length===1&&Number(hours[0][1])<24&&Number(hours[0][3])<24){fields.openingTime=hours[0][1].padStart(2,'0')+':'+hours[0][2];fields.closingTime=hours[0][3].padStart(2,'0')+':'+hours[0][4];}
  }
  const performances = extractOfficialPerformances(html);
  if (performances.length) {
    const lead = doc.querySelector('.leadBox')?.textContent?.replace(/開催決定[！!]*\s*$/, '').replace(/\s+/g, ' ').trim();
    if (lead) fields.title = lead;
    // Venue/date selection happens per performance, rather than flattening a tour.
    delete fields.startDate; delete fields.endDate; delete fields.venue;
    delete fields.doorsOpen; delete fields.startTime;
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

export interface ImportedPerformance {
  date: string;
  venue: string;
  doorsOpen?: string;
  startTime?: string;
}

/** A performance needs its own dated opening/start times, never a ticket deadline. */
export function performanceLines(text: string, venue: string): ImportedPerformance[] {
  if (!venue.trim()) return [];
  return text.normalize('NFKC').split(/\n/).flatMap(line => {
    const match = line.trim().match(/^(\d{4}[年/.\-]\s*\d{1,2}[月/.\-]\s*\d{1,2}日?)(?:\s*\([^)]*\))?\s*開場\s*[:：]?\s*(\d{1,2}:\d{2})\s*[／/]\s*開演\s*[:：]?\s*(\d{1,2}:\d{2})/);
    if (!match) return [];
    const period = eventPeriod(match[1]);
    const time = (value: string) => { const [h,m] = value.split(':').map(Number); return h < 24 && m < 60 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` : ''; };
    const doorsOpen=time(match[2]),startTime=time(match[3]);
    return period && doorsOpen && startTime ? [{ date: period.startDate, venue: venue.trim(), doorsOpen, startTime }] : [];
  });
}

export function extractOfficialPerformances(html: string): ImportedPerformance[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // The anniversary site groups each venue's live dates in these cards. Scope to
  // the cards so the ticket and live-viewing sections cannot contaminate results.
  const items = [...doc.querySelectorAll('.eventTitleBox .eventWrap')].flatMap(card => {
    const venue = card.querySelector('.place-txt')?.textContent?.trim() || '';
    const dates = card.querySelector('.place-date')?.cloneNode(true) as Element | undefined;
    if (!dates) return [];
    dates.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return performanceLines(dates.textContent || '', venue);
  });
  return [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
}

export function fieldsForPerformances(items: ImportedPerformance[]): OfficialFields {
  if (!items.length) return {};
  const dates = items.map(p => p.date).sort();
  const venues = [...new Set(items.map(p => p.venue))];
  return { startDate: dates[0], endDate: dates.at(-1), ...(venues.length === 1 ? {venue: venues[0]} : {}),
    ...(items.length === 1 ? {doorsOpen:items[0].doorsOpen,startTime:items[0].startTime} : {}) };
}

/** Read only an explicitly labelled cast block; stop before notices or another section. */
export function performersFromText(text:string):string {
  const match=text.trim().match(/^(?:[＜<【\[]\s*)?(?:出演者|出演|キャスト|CAST)\s*(?:[＞>】\]]|[:：])?\s*\n([\s\S]+)/i);
  if(!match)return '';
  const lines:string[]=[];
  for(const raw of match[1].split(/\n/)){
    const line=raw.replace(/\s+/g,' ').trim();
    if(!line)continue;
    if(/^(?:※|注[：:]|[＜<【■▼]|チケット|お問い合わせ|主催|協力|制作)/.test(line))break;
    lines.push(line);
  }
  const value=lines.join('\n');
  return value.length<=2000?value:'';
}
