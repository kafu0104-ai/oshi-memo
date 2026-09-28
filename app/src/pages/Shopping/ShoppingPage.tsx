import ShoppingImageShare from "../../components/shopping/ShoppingImageShare";
import { copyText } from "../../services/copyText";
import { OshiIcon } from "../../components/common/OshiIcon";
import { generateId } from "../../services/id";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { loadCompanions, loadEvents } from "../../services/storage";
import { emptyShopping, loadShopping, orderFor, saveShopping, totals } from "../../services/shopping";
import type { ShoppingMemo, ShoppingOrder, ShoppingProduct } from "../../services/shopping";
import { GOODS_STATUS } from "../../types/Goods";
import ProductEditor from "./ProductEditor";
import { salesLabel, salesMonth } from "../../services/productSales";
import { newGoods } from "../../services/goodsIdentity";
import GoodsUrlImport from "./GoodsUrlImport";
import ProductThumbnail from "../../components/shopping/ProductThumbnail";
const yen=(n:number)=>`${n.toLocaleString("ja-JP")}円`;
export default function ShoppingPage(){const {eventId=""}=useParams();return <Shopping key={eventId} eventId={eventId}/>;}
function Shopping({eventId}:{eventId:string}) {
  const event=loadEvents().find(e=>e.id===eventId);
  const [initial]=useState(()=>{try{return {memo:loadShopping(eventId),error:""};}catch{return {memo:emptyShopping(),error:"買い物メモを読み込めませんでした。保存データを保護するため編集を停止しています。"};}});
  const [memo,setMemo]=useState(initial.memo);
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
  const [busy,setBusy]=useState(false);
  const [shown,setShown]=useState(40);
  const [showCatalogs,setShowCatalogs]=useState(false);
  const all=buyer==="all";
  const activeBuyers=memo.buyers.filter(b=>all||b.id===buyer);
  const summary=totals(memo,all?undefined:buyer);
  function persist(next:ShoppingMemo){try{saveShopping(eventId,next);setMemo(next);setMessage("保存しました。");return true;}catch{setMessage("保存できませんでした。ブラウザの保存容量や設定を確認してください。");return false;}}
  function updateOrder(product:ShoppingProduct,buyerId:string,patch:Partial<ShoppingOrder>){
    const old=orderFor(memo,buyerId,product.id);
    const quantity=patch.quantity===undefined?old.quantity:Math.max(0,Math.min(product.limit??9999,Math.floor(patch.quantity)||0));
    persist({...memo,orders:{...memo.orders,[buyerId]:{...memo.orders[buyerId],[product.id]:{...old,...patch,quantity}}}});
  }
  async function importCatalog(kind:"grandshop"|"chiikawa"="grandshop"){
    if(memo.products.some(p=>p.id.startsWith(kind==="chiikawa"?"chiikawa-":"grandshop-"))) {setMessage("この商品データは取り込み済みです。");return;}
    setBusy(true);
    try{
      if(kind==="chiikawa") {
        const {default:catalog}=await import("../../data/chiikawaPark.json");
        persist({...memo,products:[...memo.products,...catalog]});
        return;
      }
      const {default:catalog}=await import("../../data/grandshop2026.json");
      persist({...memo,products:[...memo.products,...catalog.map(p=>({...p,id:`grandshop-${p.id}`}))],...(memo.products.length===0?{bonusThreshold:3000,bonusLabels:["YUKATA","Mystical（シャイニング）","Mystical（レイジング）"]}:{})});
    }catch{setMessage("商品一覧を取り込めませんでした。");}finally{setBusy(false);}
  }
  const visible=memo.products.filter(p=>{
    const orders=activeBuyers.map(b=>orderFor(memo,b.id,p.id));
    return `${p.name} ${p.variant} ${p.searchText??""}`.toLowerCase().includes(search.toLowerCase()) && (!category||(category==="random"?p.random:p.category===category)) && (!character||p.random||p.character===character) && (!month||salesMonth(p)===month)&&(!saleFilter||(saleFilter==="preorder"?p.saleMethod==="preorder":saleFilter==="ended"?p.saleEnded:!p.saleEnded)) && (!(selectedOnly||confirmMode)||orders.some(o=>o.quantity>0)) && (!status||(status==="売切れ"?(memo.soldOut.includes(p.id)||orders.some(o=>o.quantity>0&&o.status==="売切れ")):orders.some(o=>o.quantity>0&&o.status===status)));
  });
  if(!event)return <main><h1>イベントが見つかりません</h1><Link to="/events">イベント一覧へ</Link></main>;
  if(initial.error)return <main><p role="alert">{initial.error}</p><Link to={`/events/${eventId}`}>イベントへ戻る</Link></main>;
  return <main className="shopping-page">
    <Link to={`/events/${eventId}`}>← イベント詳細へ戻る</Link>
    <header className="page-header"><div><p className="page-eyebrow">SHOPPING MEMO</p><h1>買い物メモ</h1><p>{event.title}</p></div></header>
    <p><Link to="/shared">友人と共有する買い物メモ →</Link></p>
    <div className="shopping-summary"><div><span>購入予定・購入済み</span><strong>{summary.count}点</strong></div><div><span>合計金額</span><strong>{yen(summary.amount)}</strong></div><div><span>特典の目安</span><strong>{memo.bonusThreshold?`${summary.bonus}枚`:"未設定"}</strong></div></div>
    <p className="shopping-note">売切れの未購入分・見送り分は合計から除外します。購入済み：{yen(summary.purchased)}</p>
    <p role="status" className="shopping-message">{message}</p>
    <div className="shopping-tabs" aria-label="購入者を選択">{[{id:"all",name:"全員分"},...memo.buyers].map(b=><button key={b.id} className={b.id === "all" ? "shopping-tab-all" : "shopping-tab-buyer"} type="button" aria-pressed={buyer===b.id} onClick={()=>setBuyer(b.id)}>{b.name}</button>)}<button type="button" aria-label="購入者を追加" aria-expanded={buyerEditor==="add"} onClick={()=>setBuyerEditor(buyerEditor==="add"?null:"add")}>＋</button><button type="button" className="buyer-edit-icon" aria-label="購入者を編集" title="購入者を編集" aria-expanded={buyerEditor==="edit"} onClick={()=>setBuyerEditor(buyerEditor==="edit"?null:"edit")}><OshiIcon name="edit" size={32}/></button></div>
    {buyerEditor&&<section className="shopping-panel" aria-label="購入者の追加・編集"><div className="shopping-actions"><strong>{buyerEditor==="add"?"購入者を追加":"購入者を編集"}</strong><button type="button" onClick={()=>setBuyerEditor(null)}>閉じる</button></div>
      {buyerEditor==="add"&&<><p>誰の分を買うかを登録します。</p>
      <form className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get("name")).trim();if(!name)return;if(memo.buyers.some(b=>b.name===name)){setMessage("同じ名前の購入者がいます。");return;}if(persist({...memo,buyers:[...memo.buyers,{id:generateId(),name}]}))e.currentTarget.reset();}}><input name="name" aria-label="購入者名" required placeholder="購入者名"/><button>追加</button></form>
      <div className="shopping-actions">{loadCompanions().filter(c=>!c.deleted&&!memo.buyers.some(b=>b.id===c.id)).map(c=><button key={c.id} type="button" onClick={()=>persist({...memo,buyers:[...memo.buyers,{id:c.id,name:c.name}]})}>＋ {c.name}</button>)}</div>
      </>}
      {buyerEditor==="edit"&&memo.buyers.map(b=><form key={b.id} className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get("name")).trim();if(name)persist({...memo,buyers:memo.buyers.map(x=>x.id===b.id?{...x,name}:x)});}}><input name="name" defaultValue={b.name} aria-label={`${b.name}の名前`} required/><button>名前を保存</button>{b.id!=="self"&&<button type="button" onClick={()=>{if(!window.confirm(`${b.name}さんの数量・購入状況・特典も削除しますか？`))return;const orders={...memo.orders},bonuses={...memo.bonuses};delete orders[b.id];delete bonuses[b.id];if(persist({...memo,buyers:memo.buyers.filter(x=>x.id!==b.id),orders,bonuses})&&buyer===b.id)setBuyer("self");}}>削除</button>}</form>)}
    </section>}
    <details className="shopping-panel"><summary>特典の設定・振り分け</summary>
      <form className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const labels=String(f.get("labels")).split("、").map(x=>x.trim()).filter(Boolean);persist({...memo,bonusThreshold:Number(f.get("threshold")),bonusLabels:labels.length?labels:["特典"]});}}><label>何円ごとに1枚（0で無効）<input name="threshold" type="number" min="0" step="1" required defaultValue={memo.bonusThreshold} key={memo.bonusThreshold}/></label><label>特典名（「、」で区切る）<input name="labels" defaultValue={memo.bonusLabels.join("、")} key={memo.bonusLabels.join("、")}/></label><button>設定を保存</button></form>
      {activeBuyers.map(b=>{const allocation=memo.bonuses[b.id]??[];const available=totals(memo,b.id).bonus;const allocated=memo.bonusLabels.reduce((sum,_,i)=>sum+(allocation[i]??0),0);return <div key={b.id}><h3>{b.name}：{available}枚</h3><div className="shopping-form-row">{memo.bonusLabels.map((label,i)=><label key={i}>{label}<input type="number" min="0" max="9999" step="1" value={allocation[i]??0} onChange={e=>{const next=[...allocation];next[i]=Math.max(0,Math.floor(Number(e.target.value))||0);persist({...memo,bonuses:{...memo.bonuses,[b.id]:next}});}}/></label>)}</div><p>{allocated>available?`${allocated-available}枚オーバーしています`:allocated<available?`あと${available-allocated}枚振り分けできます`:"振り分け済み"}</p></div>;})}
      {all&&<p>全員分をまとめた会計では、個別計算より{summary.bonus-memo.buyers.reduce((sum,b)=>sum+totals(memo,b.id).bonus,0)}枚多くなる計算です。</p>}
    </details>
    <div className="shopping-actions"><button type="button" onClick={()=>setEditing("new")}>＋ 商品を追加</button><button type="button" aria-expanded={showCatalogs} onClick={()=>setShowCatalogs(!showCatalogs)}>商品データを取り込む</button><button type="button" aria-pressed={confirmMode} onClick={()=>setConfirmMode(!confirmMode)}>{confirmMode?"商品選択へ戻る":"購入内容を確認"}</button></div>
    <GoodsUrlImport existing={memo.products} onAdd={products=>{const added=newGoods(memo.products,products);if(!added.length)return 0;return persist({...memo,products:[...memo.products,...added]})?added.length:false;}}/>
    {showCatalogs&&<section className="shopping-panel" aria-label="取り込む商品データ"><h2>商品データを選択</h2><p>このイベントで使う商品一覧を選んでください。</p><button type="button" disabled={busy} onClick={()=>importCatalog("grandshop")}>{busy?"取り込み中…":"UTA☆PRI GRAND SHOP 2026"}</button><p className="shopping-note">以前の買い物メモの商品データ740件。</p><button type="button" disabled={busy} onClick={()=>importCatalog("chiikawa")}>{busy?"取り込み中…":"ちいかわパーク"}</button><p className="shopping-note">公式グッズ408件（単品・BOXを分けて409行）。2026/09/25時点。サイズ・種類がまとめられた商品はメモに希望を記入できます。在庫や当日の購入制限は現地で確認してください。</p></section>}
    <details className="shopping-panel shopping-share"><summary>買い物メモを共有用にまとめる</summary><div className="shopping-share-content"><div className="shopping-actions" aria-label="共有形式"><button type="button" aria-pressed={shareMode==="text"} onClick={()=>setShareMode("text")}>テキスト</button><button type="button" aria-pressed={shareMode==="image"} onClick={()=>setShareMode("image")}>サムネ付き画像</button></div>{shareMode==="image"?<ShoppingImageShare title={event.title} memo={memo} buyerIds={activeBuyers.map(b=>b.id)}/>:<><button type="button" onClick={()=>{const lines=[event.title,"買い物メモ"];for(const b of activeBuyers){lines.push(`【${b.name}】`);for(const p of memo.products){const o=orderFor(memo,b.id,p.id);if(o.quantity>0)lines.push(`${p.name} ${p.variant} ×${o.quantity}：${yen(p.price*o.quantity)}（${memo.soldOut.includes(p.id)?"売切れ／":""}${o.status}）${o.memo?` メモ：${o.memo}`:""}`);}lines.push(`合計：${yen(totals(memo,b.id).amount)}`);}setShareText(lines.join("\n"));setCopyMessage("");}}>共有用テキストを作成</button>{shareText&&<><label>共有内容<textarea ref={shareField} rows={8} value={shareText} onChange={e=>{setShareText(e.target.value);setCopyMessage("");}}/></label><div className="shopping-share-copy"><button type="button" onClick={copyShareText}>コピー</button>{copyMessage.startsWith("このブラウザ")&&<button type="button" onClick={selectShareText}>文章を選択</button>}<p role="status" aria-live="polite">{copyMessage}</p></div></>}</>}</div></details>
    {editing&&<ProductEditor key={editing==="new"?"new":editing.id} product={editing==="new"?undefined:editing} onCancel={()=>setEditing(null)} onSave={p=>{if(persist({...memo,products:editing==="new"?[...memo.products,p]:memo.products.map(x=>x.id===p.id?p:x)}))setEditing(null);}}/>}
    <section className="shopping-panel shopping-filters" aria-label="商品の絞り込み"><label>商品を検索<input type="text" inputMode="text" enterKeyHint="search" autoCorrect="on" defaultValue="" onCompositionStart={()=>{searchComposing.current=true;}} onCompositionEnd={e=>{searchComposing.current=false;setSearch(e.currentTarget.value);}} onChange={e=>{if(!searchComposing.current&&!(e.nativeEvent as InputEvent).isComposing)setSearch(e.currentTarget.value);}} onBlur={e=>{searchComposing.current=false;setSearch(e.currentTarget.value);}} placeholder="商品名・種類など"/></label>
      <label>カテゴリ<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべて</option><option value="random">トレーディング</option>{[...new Set(memo.products.map(p=>p.category))].filter(Boolean).map(c=><option key={c}>{c}</option>)}</select></label>
      {memo.products.some(p=>p.character)&&<label>キャラクター<select value={character} onChange={e=>setCharacter(e.target.value)}><option value="">すべて</option>{[...new Set(memo.products.map(p=>p.character))].filter(Boolean).map(c=><option key={c}>{c}</option>)}</select></label>}
      {memo.products.some(p=>salesMonth(p))&&<label>発売月<select value={month} onChange={e=>setMonth(e.target.value)}><option value="">すべて</option>{[...new Set(memo.products.map(p=>salesMonth(p)))].filter(Boolean).sort().map(m=><option key={m}>{m}</option>)}</select></label>}
      <label>販売情報<select value={saleFilter} onChange={e=>setSaleFilter(e.target.value)}><option value="">すべて</option><option value="preorder">受注販売</option><option value="active">販売終了を除く</option><option value="ended">販売終了</option></select></label>
      <label>購入状況<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">すべて</option>{GOODS_STATUS.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="shopping-check"><input type="checkbox" checked={selectedOnly} onChange={e=>setSelectedOnly(e.target.checked)}/>選んだ商品のみ</label>
    </section>
    <p>{confirmMode?"購入内容の確認":"商品一覧"}：{visible.length}件{all&&" ／ 全員分を購入者別に表示しています"}</p>
    <div className="shopping-products">{visible.slice(0,shown).map(p=>{const qty=activeBuyers.reduce((sum,b)=>sum+orderFor(memo,b.id,p.id).quantity,0);return <article className="shopping-product" key={p.id}>
      <ProductThumbnail image={p.image} name={p.name} onSave={image=>persist({...memo,products:memo.products.map(item=>item.id===p.id?{...item,image}:item)})}/>
      <div className="shopping-product-info"><h2>{p.name}</h2>{salesLabel(p)&&<p className="product-sales-badge">{salesLabel(p)}</p>}{p.saleMethod==='preorder'&&<p className="shopping-note">受注期間：{p.preorderStart||'未定'} 〜 {p.preorderEnd||'未定'}{p.shippingPlan&&` ／ 発送予定：${p.shippingPlan}`}</p>}{!p.releaseDate&&p.releaseMonth&&<p className="shopping-note">{p.releaseMonth} 発売予定</p>}{p.variant&&<p>{p.variant}</p>}<strong>{yen(p.price)}{qty>0&&` × ${qty} ＝ ${yen(p.price*qty)}`}</strong><p className="shopping-note">{p.releaseDate&&`${p.releaseDate}発売 ／ `}{p.limitText??(p.limit?`購入上限 ${p.limit}個`:"購入上限の記載なし（当日確認）")}{p.random&&" ／ トレーディング"}</p>
        {p.sourceNote&&<p className="shopping-note">{p.sourceNote}</p>}{p.sourceUrl&&<a href={p.sourceUrl} target="_blank" rel="noreferrer">公式の商品情報を確認</a>}
        <div className="shopping-actions"><button type="button" aria-pressed={memo.soldOut.includes(p.id)} onClick={()=>persist({...memo,soldOut:memo.soldOut.includes(p.id)?memo.soldOut.filter(id=>id!==p.id):[...memo.soldOut,p.id]})}>{memo.soldOut.includes(p.id)?"売切れ（解除）":"売切れにする"}</button><button type="button" onClick={()=>setEditing(p)}>編集</button><button type="button" onClick={()=>{if(window.confirm(`「${p.name}」と購入者別の登録内容を削除しますか？`)){const orders=Object.fromEntries(Object.entries(memo.orders).map(([id,items])=>[id,Object.fromEntries(Object.entries(items).filter(([id])=>id!==p.id))]));persist({...memo,products:memo.products.filter(x=>x.id!==p.id),orders,soldOut:memo.soldOut.filter(id=>id!==p.id)});}}}>削除</button></div>
        {activeBuyers.filter(b=>!all||orderFor(memo,b.id,p.id).quantity>0).map(b=>{const o=orderFor(memo,b.id,p.id);return <div className="shopping-order" key={b.id}><strong>{b.name}</strong><div className="shopping-quantity"><button type="button" aria-label={`${b.name}の${p.name}を減らす`} disabled={o.quantity===0} onClick={()=>updateOrder(p,b.id,{quantity:o.quantity-1})}>−</button><input aria-label={`${b.name}の${p.name}の数量`} type="number" min="0" max={p.limit??9999} step="1" value={o.quantity} onChange={e=>updateOrder(p,b.id,{quantity:Number(e.target.value)})}/><button type="button" aria-label={`${b.name}の${p.name}を増やす`} disabled={o.quantity>=(p.limit??9999)||memo.soldOut.includes(p.id)} onClick={()=>updateOrder(p,b.id,{quantity:o.quantity+1})}>＋</button></div><label>購入状況<select value={o.status} onChange={e=>updateOrder(p,b.id,{status:e.target.value as ShoppingOrder["status"]})}>{GOODS_STATUS.map(s=><option key={s}>{s}</option>)}</select></label><label>メモ<input aria-label={`${b.name}の${p.name}のメモ`} value={o.memo} onChange={e=>updateOrder(p,b.id,{memo:e.target.value})}/></label></div>;})}
      </div></article>;})}</div>
    {visible.length>shown&&<button type="button" onClick={()=>setShown(shown+40)}>商品をもっと見る（残り{visible.length-shown}件）</button>}
    {visible.length===0&&<div className="shopping-panel">{memo.products.length?"条件に合う商品はありません。絞り込み条件を変更してください。":"まだ商品が登録されていません。「商品を追加」から、買いたいものを登録しましょう。"}</div>}
  </main>;
}
