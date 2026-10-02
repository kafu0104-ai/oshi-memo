import { productThumbnail } from "../../services/productThumbnail";
import { useState } from 'react';
import { extractGoods, enrichGoodsDetails, goodsFromText } from '../../services/goodsImport';
import { layoutCandidates, cropImage, type LayoutCandidate } from '../../services/goodsLayout';
import GoodsCropEditor from './GoodsCropEditor';
import ProductSalesFields from "./ProductSalesFields";
import { salesError, type ProductSales } from "../../services/productSales";
import { goodsKey } from '../../services/goodsIdentity';
import { generateId } from '../../services/id';
import type { ShoppingProduct } from '../../services/shopping';
export default function GoodsUrlImport({onAdd,existing,initialUrl=''}:{initialUrl?:string;onAdd:(products:ShoppingProduct[])=>number|false;existing:ShoppingProduct[]}) {
  const [url,setUrl]=useState(initialUrl),[source,setSource]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [rows,setRows]=useState<(LayoutCandidate&ProductSales&{selected:boolean;importKey?:string;variant?:string;category?:string;limit?:string})[]>([]),[images,setImages]=useState<string[]>([]);
  const [ocrText,setOcrText]=useState(''),[ocrImage,setOcrImage]=useState('');
  async function readImage(image:string){
    setBusy(true);setOcrText('');setOcrImage(image);setMessage('画像を読み取り中…初回は読み取り用データを取得するため時間がかかります。');
    let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
    let expired=false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      await Promise.race([(async()=>{
      const response=await fetch('/api/goods-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:image}),signal:AbortSignal.timeout(30000)});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('この環境では画像読み込みを利用できません。');
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      const {createWorker}=await import('tesseract.js');
      worker=await createWorker('jpn+eng');
      if(expired){await worker.terminate();throw new Error('timeout');}
      const result=await worker.recognize(data.html,{}, {blocks:true});
      const decoded=new Image();decoded.src=data.html;await decoded.decode();
      const lines=result.data.blocks?.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines))||[];
      const proposed=layoutCandidates(lines,decoded.naturalWidth,decoded.naturalHeight,source);
      const candidates=await Promise.all(proposed.map(async row=>({...row,originalImage:data.html,image:await cropImage(data.html,row.crop!),selected:false})));
      if(expired)return;
      setRows(old=>[...old,...candidates]);
      setOcrText(result.data.text);setMessage(candidates.length?`${candidates.length}件の商品名・価格と画像範囲を推定しました。組み合わせを確認し、必要なら画像の範囲を調整してください。`:result.data.text.trim()?'画像の文字を読み取りました。内容を確認して商品候補にしてください。':'文字を読み取れませんでした。手入力で追加できます。');
      })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('timeout'));},120000);})]);
    }catch{setMessage('画像を読み取れませんでした。通信環境を確認するか、手入力で追加してください。');}
    finally{clearTimeout(timer);await worker?.terminate();setBusy(false);}
  }
  async function read(){
    setMessage('');setRows([]);setImages([]);setOcrText('');setOcrImage('');setBusy(true);
    try{
      if(new URL(url).protocol!=='https:')throw new Error('HTTPSのURLを入力してください。');
      const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:AbortSignal.timeout(45000)});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('この環境ではURL読み込みが利用できません。');
      const data=await response.json();if(!response.ok)throw new Error(data.error||'読み込めませんでした。');
      const result=extractGoods(data.html,data.url);
      setMessage('商品ごとの発売日・価格を確認しています…');
      result.products=await enrichGoodsDetails(result.products,async detailUrl=>{
        const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:detailUrl}),signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('商品詳細を取得できませんでした');const detail=await response.json();return detail.html;
      });
      setSource(data.url);setRows(result.products.filter(p=>!existing.some(item=>goodsKey(item)===goodsKey(p))).map(p=>({...p,selected:false,importKey:goodsKey(p)})));setImages(result.images);
      setMessage(result.products.length?'登録済みを除いた商品を表示しています。追加する商品を選んでください。':'商品名・価格を自動で読み取れませんでした。下の画像一覧を開いて、商品画像の文字を読み取ってください。');
    }catch(e){setMessage(e instanceof Error?e.message:'読み込めませんでした。');}finally{setBusy(false);}
  }
  const ready=(row:LayoutCandidate&ProductSales)=>!salesError(row)&&!!row.name.trim()&&/^\d+$/.test(row.price)&&Number(row.price)<=99999999&&(!row.limit||(/^\d+$/.test(row.limit)&&Number(row.limit)>=1&&Number(row.limit)<=9999));
  const readyCount=rows.filter(ready).length;
  function patch(index:number,value:Partial<LayoutCandidate&ProductSales&{selected:boolean;importKey?:string;variant?:string;category?:string;limit?:string}>){setRows(old=>old.map((row,i)=>i===index?{...row,...value}:row));}
  return <details className="shopping-panel" open><summary>グッズページURLから追加</summary>
    <div className="goods-url-import"><label className="form-field">グッズページURL<input type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={url} disabled={busy} onChange={e=>{setUrl(e.target.value);setRows([]);setImages([]);setSource('');setMessage('');setOcrText('');setOcrImage('');}}/></label><button type="button" disabled={busy||!url.trim()} onClick={read}>{busy?'読み込み中…':'読み込む'}</button>
    <p role="status">{message}</p>
    {source&&<a href={source} target="_blank" rel="noreferrer">公式ページで確認</a>}
    {images.length>0&&<details><summary>ページ内の画像から商品を追加</summary><p>商品画像を選んでください。一覧画像の場合も、商品名と価格は一つずつ入力できます。</p><div className="goods-import-images">{images.map(image=><button disabled={busy} type="button" key={image} aria-label="この画像の文字を読み取る" onClick={()=>readImage(image)}><img src={image} alt="ページ内の画像" loading="lazy" referrerPolicy="no-referrer"/></button>)}</div></details>}
    {ocrImage&&<section><img src={ocrImage} alt="読み取り元の商品画像" style={{maxWidth:'100%',maxHeight:400,objectFit:'contain'}}/><label className="form-field">読み取った文字（修正できます）<textarea rows={8} value={ocrText} onChange={e=>setOcrText(e.target.value)} /></label><p>商品名・税込価格の組み合わせを確認してください。複数列の画像では、読み取り順が前後することがあります。</p><button type="button" disabled={busy||!ocrText.trim()} onClick={()=>{const candidates=goodsFromText(ocrText,ocrImage,source);setRows(old=>[...old,...candidates.map(row=>({...row,selected:false}))]);setMessage(candidates.length?`${candidates.length}件の候補を作りました。商品名と価格を確認して選んでください。`:'価格を見つけられませんでした。手入力で追加してください。');}}>読み取った文字から商品候補を作る</button><button type="button" disabled={busy} onClick={()=>setRows(old=>[...old,{name:'',price:'',image:ocrImage,sourceUrl:source,selected:true}])}>この画像で手入力する</button></section>}
    {rows.length>0&&<form className="goods-import-form" onSubmit={async e=>{e.preventDefault();if(busy)return;const selected=rows.filter(row=>row.selected);if(!selected.length)return;if(selected.some(row=>!ready(row))){setMessage('選んだ商品の商品名・価格・購入上限を確認してください。');return;}setBusy(true);let failed=0;
      try {
        for(let i=0;i<selected.length;i+=2){
          setMessage(`商品画像を軽くして保存しています… ${i} / ${selected.length}件`);
          await Promise.all(selected.slice(i,i+2).map(async row=>{if(row.image){try{await productThumbnail(row.image);}catch{failed++;}}}));
        }
      const added=onAdd(selected.map(row=>({id:generateId(),importKey:row.importKey||goodsKey(row),name:row.name.trim(),price:Number(row.price),releaseDate:row.releaseDate,releaseMonth:row.releaseMonth,saleMethod:row.saleMethod,preorderStart:row.preorderStart,preorderEnd:row.preorderEnd,shippingPlan:row.shippingPlan,saleEnded:row.saleEnded,image:row.image||undefined,sourceUrl:row.sourceUrl,variant:row.variant?.trim()||'',category:row.category?.trim()||'',limit:row.limit?Number(row.limit):null})));if(added!==false){setRows(old=>old.filter(row=>!row.selected));setMessage(`${added}件の商品を追加しました。${selected.length-added}件は登録済みのため追加しませんでした。${failed?` ${failed}件の画像は保存できなかったため、表示・共有時に再取得します。`:""}`);}
      }catch{setMessage("登録できませんでした。もう一度お試しください。");}finally{setBusy(false);}}}>
      <fieldset disabled={busy} style={{display:"contents"}}><div className="shopping-actions"><button type="button" disabled={!readyCount} onClick={()=>setRows(old=>old.map(row=>({...row,selected:ready(row)})))}>入力済みの商品をすべて選択（{readyCount}件）</button><button type="button" onClick={()=>setRows(old=>old.map(row=>({...row,selected:false})))}>選択を解除</button></div>
      <p role="status">{rows.filter(row=>row.selected).length}件を選択中{rows.length>readyCount&&` ／ ${rows.length-readyCount}件は商品名・価格・購入上限の確認が必要です。確認後に個別で選択できます。`}</p>
      <button type="submit" disabled={busy||!rows.some(row=>row.selected)}>選んだ商品を一括追加（{rows.filter(row=>row.selected).length}件）</button>
      {rows.map((row,index)=><div className="goods-import-row" key={index}><label><input type="checkbox" checked={row.selected} onChange={e=>patch(index,{selected:e.target.checked})}/>追加する</label>{row.image&&<img src={row.image} alt="商品候補" loading="lazy" referrerPolicy="no-referrer"/>}<>{row.image&&<GoodsCropEditor source={row.originalImage||row.image} initial={row.crop||{x:0,y:0,width:100,height:100}} onApply={(image,crop)=>patch(index,{image,crop,originalImage:row.originalImage||row.image})}/>}</><label className="form-field">商品名<input value={row.name} required={row.selected} pattern={row.selected?".*\\S.*":undefined} onChange={e=>patch(index,{name:e.target.value})}/></label><label className="form-field">種類・キャラクター<input value={row.variant??''} onChange={e=>patch(index,{variant:e.target.value})}/></label><label className="form-field">単価（円）<input type="number" className="money-input" inputMode="numeric" min={row.selected?"0":undefined} max={row.selected?"99999999":undefined} step={row.selected?"1":"any"} required={row.selected} value={row.price} placeholder="価格を確認して入力" onChange={e=>patch(index,{price:e.target.value})}/></label><label className="form-field">購入上限（不明なら空欄）<input type="number" min={row.selected?"1":undefined} max={row.selected?"9999":undefined} step={row.selected?"1":"any"} value={row.limit??''} onChange={e=>patch(index,{limit:e.target.value})}/></label><label className="form-field">カテゴリ<input value={row.category??''} onChange={e=>patch(index,{category:e.target.value})}/></label><ProductSalesFields value={row} onChange={value=>patch(index,value)}/>{salesError(row)&&<p role="alert">{salesError(row)}</p>}</div>)}
      <button type="submit" disabled={busy||!rows.some(row=>row.selected)}>選んだ商品を追加</button></fieldset>
    </form>}
    </div></details>;
}
