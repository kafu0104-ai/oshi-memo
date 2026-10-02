import { memoInfo, shoppingForEvent, listShoppingMemos } from "../../services/shoppingMemos";
import { OshiIcon } from "../../components/common/OshiIcon";
import BonusPanel from "./BonusPanel";
import { recordPurchases,nextShopping } from "../../services/shoppingHistory";
import ShoppingImageShare from "../../components/shopping/ShoppingImageShare";
import { copyText } from "../../services/copyText";
import { generateId } from "../../services/id";
import { useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { loadCompanions, loadEvents } from "../../services/storage";
import { emptyShopping, loadShopping, orderFor, saveShopping, totals, hasShoppingMemo } from "../../services/shopping";
import type { ShoppingMemo, ShoppingOrder, ShoppingProduct } from "../../services/shopping";
import { GOODS_STATUS } from "../../types/Goods";
import ProductEditor from "./ProductEditor";
import { salesLabel, salesMonth } from "../../services/productSales";
import { newGoods } from "../../services/goodsIdentity";
import GoodsUrlImport from "./GoodsUrlImport";
import ProductThumbnail from "../../components/shopping/ProductThumbnail";
const characterNames=(p:ShoppingProduct)=> (p.character||p.variant||'').split(/[、,・／/]+/).map(x=>x.trim()).filter(x=>x&&!/^(?:単品|BOX|ボックス|ランダム|全\d+種|[SMLX]+|ONE)$/i.test(x));
const yen=(n:number)=>`${n.toLocaleString("ja-JP")}円`;
export default function ShoppingPage(){
 const {eventId,memoId}=useParams();
 if(eventId){const events=loadEvents();const linked=shoppingForEvent(eventId,events);if(linked.length===1)return <Navigate replace to={`/shopping/${linked[0].id}`}/>;if(linked.length>1)return <Navigate replace to={`/shopping?event=${eventId}`}/>;if(listShoppingMemos(events).errors.includes(eventId))return <Shopping key={eventId} eventId={eventId}/>;return <Navigate replace to={`/shopping/new?event=${eventId}`}/>;}
 return <Shopping key={memoId} eventId={memoId??""}/>;
}
function Shopping({eventId}:{eventId:string}) {
  const events=loadEvents();
  const [initial]=useState(()=>{try{return {memo:loadShopping(eventId),error:""};}catch{return {memo:emptyShopping(),error:"買い物メモを読み込めませんでした。保存データを保護するため編集を停止しています。"};}});
  const [memo,setMemo]=useState(initial.memo);
  const info=memoInfo(eventId,memo,events);
  const event=events.find(e=>e.id===info.eventId);
  const title=info.title;
  const [editInfo,setEditInfo]=useState(false);
  const cycle=useRef(initial.memo.purchaseCycle||generateId());
  const [message,setMessage]=useState("");
  const [buyerEditor,setBuyerEditor]=useState<"add"|"edit"|null>(null);
  const [buyer,setBuyer]=useState("self");
  const [search,setSearch]=useState("");
  const searchComposing=useRef(false);
  const [category,setCategory]=useState("");
  const [character,setCharacter]=useState("");
  const [saleFilter,setSaleFilter]=useState("");
  const [month,setMonth]=useState("");
  const [status,setStatus]=useState("");
  const [selectedOnly,setSelectedOnly]=useState(false);
  const [confirmMode,setConfirmMode]=useState(false);
  const [shareText,setShareText]=useState("");
  const [shareMode,setShareMode]=useState<"text"|"image">("text");
  const shareField=useRef<HTMLTextAreaElement>(null);
  const [copyMessage,setCopyMessage]=useState("");
  async function copyShareText(){
    const field=shareField.current;
    if(!field)return;
    const copied=await copyText(field.value);
    setCopyMessage(copied?"コピーしました。LINEなどに貼り付けられます。":"このブラウザでは自動コピーできません。下の「文章を選択」を押し、文章を長押しして「コピー」を選んでください。");
  }
  function selectShareText(){
    const field=shareField.current;
    if(!field)return;
    field.focus({preventScroll:true});field.select();field.setSelectionRange(0,field.value.length);
  }
  const [editing,setEditing]=useState<ShoppingProduct|"new"|null>(null);
  const [shown,setShown]=useState(40);
  const all=buyer==="all";
  const activeBuyers=memo.buyers.filter(b=>all||b.id===buyer);
  const summary=totals(memo,all?undefined:buyer);
  function persist(next:ShoppingMemo){try{saveShopping(eventId,next);setMemo(next);setMessage("保存しました。");return true;}catch{setMessage("保存できませんでした。ブラウザの保存容量や設定を確認してください。");return false;}}
  function updateOrder(product:ShoppingProduct,buyerId:string,patch:Partial<ShoppingOrder>){
    const old=orderFor(memo,buyerId,product.id);
    const quantity=patch.quantity===undefined?old.quantity:Math.max(0,Math.min(product.limit??9999,Math.floor(patch.quantity)||0));
    persist({...memo,orders:{...memo.orders,[buyerId]:{...memo.orders[buyerId],[product.id]:{...old,...patch,quantity}}}});
  }
  const visible=memo.products.filter(p=>{
    const orders=activeBuyers.map(b=>orderFor(memo,b.id,p.id));
    return `${p.name} ${p.variant} ${p.searchText??""}`.toLowerCase().includes(search.toLowerCase()) && (!category||(category==="random"?p.random:p.category===category)) && (!character||p.random||characterNames(p).includes(character)) && (!month||salesMonth(p)===month)&&(!saleFilter||((saleFilter==="preorder"||saleFilter==="reservation")?p.saleMethod===saleFilter:saleFilter==="ended"?p.saleEnded:!p.saleEnded)) && (!(selectedOnly||confirmMode)||orders.some(o=>o.quantity>0)) && (!status||(status==="売切れ"?(memo.soldOut.includes(p.id)||orders.some(o=>o.quantity>0&&o.status==="売切れ")):orders.some(o=>o.quantity>0&&o.status===status)));
  });
  if(!hasShoppingMemo(eventId))return <main><h1>買い物メモが見つかりません</h1><Link className="task-navigation-button" to="/shopping">一覧へ戻る</Link></main>;
  if(initial.error)return <main><p role="alert">{initial.error}</p><Link className="task-navigation-button" to="/shopping">一覧へ戻る</Link></main>;
  return <main className="shopping-page shopping-compact">
    <header className="shopping-heading"><h1 className="shopping-memo-title"><span className="shopping-memo-category">買い物メモ</span><span className="shopping-memo-separator" aria-hidden="true">›</span><span>{title}</span></h1><button type="button" className="shopping-info-edit" aria-label="メモ名・関連イベントを編集" aria-expanded={editInfo} onClick={()=>setEditInfo(v=>!v)}><OshiIcon name="edit" size={24}/></button></header>
    {editInfo&&<form className="shopping-panel task-completion-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('title')).trim();if(!name)return;if(persist({...memo,info:{title:name,eventId:String(f.get('event'))||undefined}}))setEditInfo(false);}}>
      <label className="form-field">メモ名（必須）<input name="title" required maxLength={120} defaultValue={title}/></label>
      <label className="form-field">関連イベント（任意）<select name="event" defaultValue={event?.id??''}><option value="">紐づけない</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <div className="shopping-actions"><button type="submit">保存</button><button type="button" className="secondary-button" onClick={()=>setEditInfo(false)}>キャンセル</button></div>
    </form>}
    <details className="shopping-panel" open={memo.products.length===0?true:undefined}><summary>商品を追加</summary>
    <GoodsUrlImport existing={memo.products} onAdd={products=>{const added=newGoods(memo.products,products);if(!added.length)return 0;return persist({...memo,products:[...memo.products,...added]})?added.length:false;}}/>
    <div className="shopping-actions"><button type="button" onClick={()=>setEditing("new")}>＋ 商品を手作業で追加</button></div>
</details>
    <div className="shopping-summary"><div><span>選択商品</span><strong>{summary.count}点</strong></div><div><span>合計金額</span><strong>{yen(summary.amount)}</strong></div><div><span>特典の目安</span><strong>{memo.bonusThreshold?`${summary.bonus}枚`:"未設定"}</strong></div></div>
    <p className="shopping-note shopping-total-note">売切れ・見送り分は合計から除外</p>
    {message&&<p role="status" className="shopping-message">{message}</p>}
    <div className="shopping-buyer-heading"><strong>購入者 <small>タブごとに数量を管理</small></strong><button type="button" className="buyer-edit-link" onClick={()=>setBuyerEditor(buyerEditor==="edit"?null:"edit")}>編集</button></div>
    <div className="shopping-tabs" aria-label="購入者を選択">{[{id:"all",name:"全員分"},...memo.buyers].map(b=><button key={b.id} className={b.id === "all" ? "shopping-tab-all" : "shopping-tab-buyer"} type="button" aria-pressed={buyer===b.id} onClick={()=>setBuyer(b.id)}>{b.name}</button>)}<button className="buyer-add-tab" type="button" aria-label="購入者を追加" aria-expanded={buyerEditor==="add"} onClick={()=>setBuyerEditor(buyerEditor==="add"?null:"add")}>＋ 追加</button></div>
    {all&&<p className="shopping-buyer-note">全員分を合算しています。数量の変更は各購入者タブで行えます。</p>}
    {buyerEditor&&<section className="shopping-panel" aria-label="購入者の追加・編集"><div className="shopping-actions"><strong>{buyerEditor==="add"?"購入者を追加":"購入者を編集"}</strong><button type="button" onClick={()=>setBuyerEditor(null)}>閉じる</button></div>
      {buyerEditor==="add"&&<><p>誰の分を買うかを登録します。</p>
      <form className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get("name")).trim();if(!name)return;if(memo.buyers.some(b=>b.name===name)){setMessage("同じ名前の購入者がいます。");return;}if(persist({...memo,buyers:[...memo.buyers,{id:generateId(),name}]}))e.currentTarget.reset();}}><input name="name" aria-label="購入者名" required placeholder="購入者名"/><button>追加</button></form>
      <div className="shopping-actions">{loadCompanions().filter(c=>!c.deleted&&!memo.buyers.some(b=>b.id===c.id)).map(c=><button key={c.id} type="button" onClick={()=>persist({...memo,buyers:[...memo.buyers,{id:c.id,name:c.name}]})}>＋ {c.name}</button>)}</div>
      </>}
      {buyerEditor==="edit"&&memo.buyers.map(b=><form key={b.id} className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get("name")).trim();if(name)persist({...memo,buyers:memo.buyers.map(x=>x.id===b.id?{...x,name}:x)});}}><input name="name" defaultValue={b.name} aria-label={`${b.name}の名前`} required/><button>名前を保存</button>{b.id!=="self"&&<button type="button" onClick={()=>{if(!window.confirm(`${b.name}さんの数量・購入状況・特典も削除しますか？`))return;const orders={...memo.orders},bonuses={...memo.bonuses};delete orders[b.id];delete bonuses[b.id];if(persist({...memo,buyers:memo.buyers.filter(x=>x.id!==b.id),orders,bonuses})&&buyer===b.id)setBuyer("self");}}>削除</button>}</form>)}
    </section>}
    {editing&&<ProductEditor key={editing==="new"?"new":editing.id} product={editing==="new"?undefined:editing} onCancel={()=>setEditing(null)} onSave={p=>{if(persist({...memo,products:editing==="new"?[...memo.products,p]:memo.products.map(x=>x.id===p.id?p:x)}))setEditing(null);}}/>}
    <section id="shopping-filters" className="shopping-panel shopping-filters" aria-label="商品の絞り込み"><label>商品を検索<input type="text" inputMode="text" enterKeyHint="search" autoCorrect="on" defaultValue="" onCompositionStart={()=>{searchComposing.current=true;}} onCompositionEnd={e=>{searchComposing.current=false;setSearch(e.currentTarget.value);}} onChange={e=>{if(!searchComposing.current&&!(e.nativeEvent as InputEvent).isComposing)setSearch(e.currentTarget.value);}} onBlur={e=>{searchComposing.current=false;setSearch(e.currentTarget.value);}} placeholder="商品名・種類など"/></label>
      <label>カテゴリ<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべて</option><option value="random">トレーディング</option>{[...new Set(memo.products.map(p=>p.category))].filter(Boolean).map(c=><option key={c}>{c}</option>)}</select></label>
      {memo.products.some(p=>characterNames(p).length)&&<label>種類・キャラクター<select value={character} onChange={e=>setCharacter(e.target.value)}><option value="">すべて</option>{[...new Set(memo.products.flatMap(characterNames))].filter(Boolean).map(c=><option key={c}>{c}</option>)}</select></label>}
      {memo.products.some(p=>salesMonth(p))&&<label>発売月<select value={month} onChange={e=>setMonth(e.target.value)}><option value="">すべて</option>{[...new Set(memo.products.map(p=>salesMonth(p)))].filter(Boolean).sort().map(m=><option key={m}>{m}</option>)}</select></label>}
      <label>販売情報<select value={saleFilter} onChange={e=>setSaleFilter(e.target.value)}><option value="">すべて</option><option value="reservation">予約販売</option><option value="preorder">受注販売</option><option value="active">販売終了を除く</option><option value="ended">販売終了</option></select></label>
      <label>購入状況<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">すべて</option>{GOODS_STATUS.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="shopping-check"><input type="checkbox" checked={selectedOnly} onChange={e=>setSelectedOnly(e.target.checked)}/>選んだ商品のみ</label>
    </section>
    <BonusPanel memo={memo} buyer={buyer} onSave={persist}/>
    <p>{confirmMode?"購入内容の確認":"商品一覧"}：{visible.length}件{all&&" ／ 全員分の数量を合算しています"}</p>
    {confirmMode&&<section className="shopping-panel"><h2>購入内容を確認</h2><p>購入者タブで切り替え、購入した商品にチェックを入れてください。「購入を完了」で全員分のチェック済み商品を購入履歴に保存します。未確認の商品は履歴に入りません。</p>
      {activeBuyers.map(b=><div key={b.id}>{memo.products.filter(p=>orderFor(memo,b.id,p.id).quantity>0).map(p=>{const o=orderFor(memo,b.id,p.id);return <div className="shopping-confirm-item" key={p.id}>{p.image&&<img src={p.image} alt=""/>}<div><strong>{p.name} {p.variant}</strong><p>{b.name} ／ {o.quantity}点 ／ {yen(p.price*o.quantity)}</p><label className="shopping-check"><input type="checkbox" checked={o.status==="購入済み"} onChange={e=>updateOrder(p,b.id,{status:e.target.checked?"購入済み":"未購入"})}/>購入確認</label></div></div>;})}</div>)}
      <button className="shopping-complete-button" type="button" disabled={!memo.buyers.some(b=>memo.products.some(p=>{const o=orderFor(memo,b.id,p.id);return o.quantity>0&&o.status==="購入済み";}))} onClick={()=>{const now=new Date().toISOString();if(persist({...recordPurchases(memo,cycle.current,now),purchaseCompletedAt:now})){setConfirmMode(false);setMessage('購入履歴に保存しました。「次の買い物を始める」で選択をクリアできます。');}}}>購入を完了</button>
    </section>}
    {!confirmMode&&<div className="shopping-products">{visible.slice(0,shown).map(p=>{const qty=activeBuyers.reduce((sum,b)=>sum+orderFor(memo,b.id,p.id).quantity,0);return <article className="shopping-product" key={p.id}>
      <ProductThumbnail image={p.image} name={p.name} onSave={image=>persist({...memo,products:memo.products.map(item=>item.id===p.id?{...item,image}:item)})}/>
      <div className="shopping-product-info"><h2>{p.name}</h2>{salesLabel(p)&&<p className="product-sales-badge">{salesLabel(p)}</p>}{(p.saleMethod==='preorder'||p.saleMethod==='reservation')&&<p className="shopping-note">{p.saleMethod==='reservation'?'予約':'受注'}期間：{p.preorderStart||'未定'} 〜 {p.preorderEnd||'未定'}{p.shippingPlan&&` ／ 発送予定：${p.shippingPlan}`}</p>}{!p.releaseDate&&p.releaseMonth&&<p className="shopping-note">{p.releaseMonth} 発売予定</p>}{p.variant&&<p>{p.variant}</p>}<strong>{yen(p.price)}{qty>0&&` × ${qty} ＝ ${yen(p.price*qty)}`}</strong><p className="shopping-note">{p.releaseDate&&`${p.releaseDate}発売 ／ `}{p.limitText??(p.limit?`購入上限 ${p.limit}個`:"購入上限の記載なし（当日確認）")}{p.random&&" ／ トレーディング"}</p>
        {p.sourceNote&&<p className="shopping-note">{p.sourceNote}</p>}{p.sourceUrl&&<a href={p.sourceUrl} target="_blank" rel="noreferrer">公式の商品情報を確認</a>}
        <details className="shopping-product-tools"><summary>商品を編集・削除</summary><div className="shopping-actions"><button type="button" onClick={()=>setEditing(p)}>編集</button><button type="button" onClick={()=>{if(window.confirm(`「${p.name}」と購入者別の登録内容を削除しますか？`)){const orders=Object.fromEntries(Object.entries(memo.orders).map(([id,items])=>[id,Object.fromEntries(Object.entries(items).filter(([id])=>id!==p.id))]));persist({...memo,products:memo.products.filter(x=>x.id!==p.id),orders,soldOut:memo.soldOut.filter(id=>id!==p.id)});}}}>削除</button></div></details>
        {all&&<div className="shopping-stock-row"><label className="shopping-check shopping-sold-out"><input type="checkbox" aria-label={`${p.name}の売切れ`} checked={memo.soldOut.includes(p.id)} onChange={e=>persist({...memo,soldOut:e.target.checked?[...memo.soldOut,p.id]:memo.soldOut.filter(id=>id!==p.id)})}/>売切れ</label><strong>{qty}点</strong></div>}{all&&qty>0&&<p className="shopping-buyer-breakdown">{activeBuyers.filter(b=>orderFor(memo,b.id,p.id).quantity>0).map(b=>`${b.name}：${orderFor(memo,b.id,p.id).quantity}点`).join(" ／ ")}</p>}
        {activeBuyers.filter(()=>!all).map(b=>{const o=orderFor(memo,b.id,p.id);return <div className="shopping-order" key={b.id}><div className="shopping-stock-row"><label className="shopping-check shopping-sold-out"><input type="checkbox" aria-label={`${p.name}の売切れ`} checked={memo.soldOut.includes(p.id)} onChange={e=>persist({...memo,soldOut:e.target.checked?[...memo.soldOut,p.id]:memo.soldOut.filter(id=>id!==p.id)})}/>売切れ</label><div className="shopping-quantity"><button type="button" aria-label={`${b.name}の${p.name}を減らす`} disabled={o.quantity===0} onClick={()=>updateOrder(p,b.id,{quantity:o.quantity-1})}>−</button><input aria-label={`${b.name}の${p.name}の数量`} type="number" min="0" max={p.limit??9999} step="1" value={o.quantity} onChange={e=>updateOrder(p,b.id,{quantity:Number(e.target.value)})}/><button type="button" aria-label={`${b.name}の${p.name}を増やす`} disabled={o.quantity>=(p.limit??9999)||memo.soldOut.includes(p.id)} onClick={()=>updateOrder(p,b.id,{quantity:o.quantity+1})}>＋</button></div></div><details className="shopping-order-details"><summary>購入状況・メモ{o.status!=="未購入"&&` ／ ${o.status}`}{o.memo&&" ／ メモあり"}</summary><div className="shopping-order-fields"><label>購入状況<select value={o.status} onChange={e=>updateOrder(p,b.id,{status:e.target.value as ShoppingOrder["status"]})}>{GOODS_STATUS.map(s=><option key={s}>{s}</option>)}</select></label><label>メモ<input aria-label={`${b.name}の${p.name}のメモ`} value={o.memo} onChange={e=>updateOrder(p,b.id,{memo:e.target.value})}/></label></div></details></div>;})}
      </div></article>;})}</div>}
    {!confirmMode&&visible.length>shown&&<button className="shopping-load-more" type="button" onClick={()=>setShown(shown+40)}>商品をもっと見る（残り{visible.length-shown}件）</button>}
    {visible.length===0&&<div className="shopping-panel">{memo.products.length?"条件に合う商品はありません。絞り込み条件を変更してください。":"まだ商品が登録されていません。「商品を追加」から、買いたいものを登録しましょう。"}</div>}
    <details id="shopping-share" className="shopping-panel shopping-share"><summary>買い物メモを共有用にまとめる</summary><div className="shopping-share-content"><div className="shopping-actions" aria-label="共有形式"><button type="button" aria-pressed={shareMode==="text"} onClick={()=>setShareMode("text")}>テキスト</button><button type="button" aria-pressed={shareMode==="image"} onClick={()=>setShareMode("image")}>サムネ付き画像</button></div>{shareMode==="image"?<ShoppingImageShare title={title} memo={memo} buyerIds={activeBuyers.map(b=>b.id)}/>:<><button type="button" onClick={()=>{const lines=[title,"買い物メモ"];for(const b of activeBuyers){lines.push(`【${b.name}】`);for(const p of memo.products){const o=orderFor(memo,b.id,p.id);if(o.quantity>0)lines.push(`${p.name} ${p.variant} ×${o.quantity}：${yen(p.price*o.quantity)}（${memo.soldOut.includes(p.id)?"売切れ／":""}${o.status}）${o.memo?` メモ：${o.memo}`:""}`);}lines.push(`合計：${yen(totals(memo,b.id).amount)}`);}setShareText(lines.join("\n"));setCopyMessage("");}}>共有用テキストを作成</button>{shareText&&<><label>共有内容<textarea ref={shareField} rows={8} value={shareText} onChange={e=>{setShareText(e.target.value);setCopyMessage("");}}/></label><div className="shopping-share-copy"><button type="button" onClick={copyShareText}>コピー</button>{copyMessage.startsWith("このブラウザ")&&<button type="button" onClick={selectShareText}>文章を選択</button>}<p role="status" aria-live="polite">{copyMessage}</p></div></>}</>}</div></details>
    <details className="shopping-panel"><summary>購入履歴（{(memo.purchaseHistory||[]).length}件）</summary>
      {!(memo.purchaseHistory||[]).length&&<p>購入内容を確認し、「購入を完了」を押すとここに記録されます。</p>}
      {(memo.purchaseHistory||[]).map(h=><article key={h.id} className="exchange-section"><p>{new Date(h.purchasedAt).toLocaleDateString('ja-JP')} ／ {h.buyerName}</p><strong>{h.name} {h.variant}</strong><p>{h.quantity}点 ／ {yen(h.price*h.quantity)}</p>{h.memo&&<p>{h.memo}</p>}</article>)}
    </details>
    {memo.purchaseCompletedAt&&<button type="button" className="secondary-button" onClick={()=>{if(!window.confirm('全員分の数量・購入状態・特典の振り分けをクリアします。未確認の商品もクリアされます。商品一覧と購入履歴は残ります。次の買い物を始めますか？'))return;const id=generateId();if(persist(nextShopping(memo,id))){cycle.current=id;setConfirmMode(false);setSelectedOnly(false);setStatus('');setShareText('');setMessage('購入履歴を残して、次の買い物用に選択をクリアしました。');}}}>次の買い物を始める</button>}
    <p><Link className="task-navigation-button" to="/shared">共有している買い物メモ</Link></p>
    <div className="shopping-bottom-actions"><button type="button" aria-pressed={confirmMode} onClick={()=>{setConfirmMode(!confirmMode);setSearch("");setCategory("");setCharacter("");setMonth("");setSaleFilter("");setStatus("");}}>{confirmMode?"商品選択へ戻る":"購入内容を確認"}</button><button type="button" onClick={()=>{setShareMode('image');const panel=document.getElementById('shopping-share') as HTMLDetailsElement|null;if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'});}}}>共有画像を作る</button></div>
  </main>;
}
