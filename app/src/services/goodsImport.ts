export interface GoodsCandidate { name:string; price:string; image:string; sourceUrl:string; variant?:string; category?:string; limit?:string }
export function safeGoodsUrl(value:unknown, base:string):string {
  if(typeof value!=='string'||!value.trim())return '';
  try{const url=new URL(value,base);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function extractGoods(html:string, base:string):{products:GoodsCandidate[];images:string[]} {
  const doc=new DOMParser().parseFromString(html,'text/html');
  const products:GoodsCandidate[]=[];
  function visit(value:unknown,depth=0){
    if(depth>20||!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(item=>visit(item,depth+1));return;}
    const node=value as Record<string,unknown>;
    const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
    if(types.includes('Product')&&typeof node.name==='string'){
      const offers=Array.isArray(node.offers)?node.offers:[node.offers];
      const offer=offers.find(item=>item&&typeof item==='object'&&(!item.priceCurrency||item.priceCurrency==='JPY'));
      const raw=offer?.price;
      const price=typeof raw==='number'||typeof raw==='string'?String(raw).replace(/,/g,''):'';
      const img=Array.isArray(node.image)?node.image[0]:node.image;
      products.push({name:node.name,price:/^\d+$/.test(price)?price:'',image:safeGoodsUrl(typeof img==='object'&&img?img.url:img,base),sourceUrl:safeGoodsUrl(node.url,base)||base});
    }
    Object.values(node).forEach(item=>visit(item,depth+1));
  }
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script=>{try{visit(JSON.parse(script.textContent||''));}catch{/* malformed metadata is skipped */}});
  if(new URL(base).hostname==='chiikawapark-tokyo.jp')products.push(...parkGoods(html,base));
  if(new URL(base).hostname==='www.broccoli.co.jp'&&new URL(base).pathname.startsWith('/event_sp/agf/'))products.push(...broccoliAgfGoods(doc,base));
  const images=[...new Set(Array.from(doc.querySelectorAll('img')).map(img=>safeGoodsUrl(img.getAttribute('data-src')||img.getAttribute('src'),base)).filter(Boolean))].slice(0,100);
  return {products:products.filter((p,i)=>products.findIndex(x=>x.name===p.name&&x.price===p.price&&x.image===p.image)===i).slice(0,1000),images};
}

// OCR reading order may be imperfect; every proposed item remains unchecked.
export function goodsFromText(text:string,image:string,sourceUrl:string):GoodsCandidate[] {
  const lines=text.normalize('NFKC').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  return lines.flatMap((line,index)=>{
    const prices=[...line.matchAll(/(?:[¥￥]\s*([\d][\d,.\s]*)|(?<![\d,.])([\d][\d,.\s]*)\s*円)/g)];
    if(prices.length!==1)return [];
    const match=prices[0];
    const raw=(match[1]||match[2]).replace(/\s/g,'');
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw))return [];
    const price=raw.replace(/,/g,'');
    if(!/^\d+$/.test(price)||Number(price)>99999999)return [];
    const same=line.slice(0,match.index).replace(/(?:税込|価格|販売価格|各|\s|[（(])+$/g,'').trim();
    const name=(same&&/^【[^】]+】$/.test(same)?`${lines[index-1]||''} ${same}`:same||lines[index-1]||'').replace(/(?<=[ぁ-んァ-ヶ一-龯]) +(?=[ぁ-んァ-ヶ一-龯])/g,'');
    return [{name,price,image,sourceUrl}];
  });
}

// Decode Next.js serialized JSON as data only; never execute page scripts.
export function parkGoods(html:string,base:string):GoodsCandidate[]{
  let flight='';
  for(const match of html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)){
    try{const chunk=JSON.parse(match[1]);if(Array.isArray(chunk)&&typeof chunk[1]==='string')flight+=chunk[1];}catch{/* ignore non-JSON scripts */}
  }
  const marker='"goodsItems":';const found=flight.indexOf(marker);if(found<0)return [];
  const start=flight.indexOf('[',found+marker.length);if(start<0)return [];
  let depth=0,quoted=false,escaped=false,end=-1;
  for(let i=start;i<flight.length;i++){const ch=flight[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='[')depth++;else if(ch===']'&&--depth===0){end=i+1;break;}}
  if(end<0)return [];
  try{
    const items=JSON.parse(flight.slice(start,end));
    return items.flatMap((item:Record<string,unknown>)=>{
      if(typeof item.title!=='string'||typeof item.price!=='string')return [];
      const text=item.price.normalize('NFKC');const numbers=text.match(/\d[\d,.]*/g)||[];
      const variants=numbers.length===2&&text.includes('単品')&&text.includes('BOX')?['単品','BOX']:[''];
      const imgs=Array.isArray(item.images)?item.images:[];
      const limit=typeof item.limitText==='string'?item.limitText.normalize('NFKC').match(/(\d+)点/)?.[1]:undefined;
      return variants.map((variant,index)=>{const number=numbers[index]||'';return {name:item.title as string,variant,category:typeof item.category==='string'?item.category:'',limit,image:safeGoodsUrl(imgs[0]?.url,base),sourceUrl:base,price:(numbers.length===variants.length&&/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(number))?number.replace(/,/g,''):''};});
    });
  }catch{return [];}
}


export function broccoliAgfGoods(doc:Document,base:string):GoodsCandidate[]{
 const text=(node:Element|null)=>node?.textContent?.replace(/\s+/g,' ').trim()||'';
 const result:GoodsCandidate[]=[];
 for(const card of Array.from(doc.querySelectorAll('.p-goods__item'))){
  const id=card.querySelector('[data-modal-page]')?.getAttribute('data-modal-page')||'';
  const modal=Array.from(doc.querySelectorAll('.p-modal_item')).find(el=>id&&el.classList.contains(id));
  const name=text(card.querySelector('.p-goods__name'));
  const price=text(card.querySelector('.p-goods__price')).match(/([\d,]+)\s*円/)?.[1].replaceAll(',','')||'';
  if(!name||!price)continue;
  const rows=Array.from(modal?.querySelectorAll('tr')||[]);
  const limitText=text(rows.find(row=>text(row.querySelector('th')).includes('購入制限'))?.querySelector('td')||null).normalize('NFKC');
  const limit=limitText.match(/(?:各|様)\s*(\d+)\s*(?:個|点|枚|冊)/)?.[1]||'';
  const kindCell=rows.find(row=>text(row.querySelector('th')).includes('種類数'))?.querySelector('td');
  const random=/ランダム/.test(text(kindCell||null));
  const names=Array.from(modal?.querySelectorAll('.p-modal_item__kindname')||[]).map(el=>text(el).replace(/^[｢「]|[｣」]$/g,''));
  const photos=Array.from(modal?.querySelectorAll('.p-modal_item__gallery img')||[]).map(img=>safeGoodsUrl(img.getAttribute('src'),base));
  const image=safeGoodsUrl(card.querySelector('img')?.getAttribute('src'),base);
  const common={name,price,sourceUrl:base,category:text(card.querySelector('.p-goods__sell')),limit};
  // Only pair individual images when the official ordered lists match exactly.
  if(!random&&names.length>1&&names.length===photos.length){
    names.forEach((variant,i)=>result.push({...common,variant,image:photos[i]||image}));
  }else result.push({...common,image,variant:random?'ランダム':''});
 }
 return result;
}
