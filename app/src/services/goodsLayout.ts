import { goodsFromText, type GoodsCandidate } from './goodsImport';
export interface Crop { x:number; y:number; width:number; height:number }
export interface LayoutLine { text:string; bbox:{x0:number;y0:number;x1:number;y1:number} }
export interface LayoutCandidate extends GoodsCandidate { originalImage?:string; crop?:Crop }
// Price anchors divide rows and columns. These are reviewable estimates, not object detection.
export function layoutCandidates(lines:LayoutLine[],width:number,height:number,sourceUrl:string):LayoutCandidate[] {
  const anchors=lines.filter(line=>goodsFromText(line.text,'',sourceUrl).length===1);
  return anchors.map(anchor=>{
    const b=anchor.bbox, cx=(b.x0+b.x1)/2, cy=(b.y0+b.y1)/2;
    const peers=anchors.filter(other=>other!==anchor&&Math.abs((other.bbox.y0+other.bbox.y1)/2-cy)<Math.max(40,(b.y1-b.y0)*3));
    const left=peers.filter(p=>(p.bbox.x0+p.bbox.x1)/2<cx).sort((a,b)=>b.bbox.x0-a.bbox.x0)[0];
    const right=peers.filter(p=>(p.bbox.x0+p.bbox.x1)/2>cx).sort((a,b)=>a.bbox.x0-b.bbox.x0)[0];
    const x0=left?((left.bbox.x0+left.bbox.x1)/2+cx)/2:0;
    const x1=right?((right.bbox.x0+right.bbox.x1)/2+cx)/2:width;
    const previous=anchors.filter(p=>p.bbox.y1<b.y0-40&&p.bbox.x1>x0&&p.bbox.x0<x1).sort((a,b)=>b.bbox.y1-a.bbox.y1)[0];
    const y0=previous?previous.bbox.y1+4:0;
    const above=lines.filter(p=>p!==anchor&&!anchors.includes(p)&&p.bbox.y1<=b.y0+2&&p.bbox.y0>=y0&&p.bbox.x1>x0&&p.bbox.x0<x1).sort((a,b)=>b.bbox.y1-a.bbox.y1)[0];
    const product=goodsFromText(`${above?.text||''}\n${anchor.text}`,'',sourceUrl)[0];
    return {...product,crop:{x:x0/width*100,y:y0/height*100,width:(x1-x0)/width*100,height:(Math.min(height,b.y1+12)-y0)/height*100}};
  });
}
export async function cropImage(source:string,crop:Crop):Promise<string>{
  const image=new Image();image.src=source;await image.decode();
  const x=image.naturalWidth*crop.x/100,y=image.naturalHeight*crop.y/100;
  const w=Math.max(1,image.naturalWidth*Math.min(crop.width,100-crop.x)/100),h=Math.max(1,image.naturalHeight*Math.min(crop.height,100-crop.y)/100);
  const scale=Math.min(1,480/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('画像を作成できませんでした。');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.85);
}
