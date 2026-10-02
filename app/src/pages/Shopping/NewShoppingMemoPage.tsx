import { useEffect, useRef, useState } from 'react';
import { OshiIcon } from '../../components/common/OshiIcon';
import type { ShoppingMemo } from '../../services/shopping';
import { Link,useSearchParams } from 'react-router';
import { loadEvents } from '../../services/storage';
import { emptyShopping,saveShopping,totals,type ShoppingProduct } from '../../services/shopping';
import { generateId } from '../../services/id';
import { newGoods } from '../../services/goodsIdentity';
import GoodsUrlImport from './GoodsUrlImport';
import ProductEditor from './ProductEditor';
export default function NewShoppingMemoPage(){
 const [params]=useSearchParams();const events=loadEvents();const initialEvent=events.find(e=>e.id===params.get('event'));
 const [id]=useState(generateId);const [step,setStep]=useState(1);const [title,setTitle]=useState(initialEvent?.title??'');const [eventId,setEventId]=useState(initialEvent?.id??'');
 const [memo,setMemo]=useState(emptyShopping);const [editing,setEditing]=useState<ShoppingProduct|'new'|null>(null);const [error,setError]=useState('');
 const completionHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(step===3)completionHeading.current?.focus();},[step]);
 function advance(next:number){if(next>1&&!title.trim()){setError('メモ名を入力してください。');return;}setError('');setStep(next);window.scrollTo({top:0});}
 function storeMemo(next:ShoppingMemo){try{saveShopping(id,{...next,info:{title:title.trim(),eventId:eventId||undefined}});setError('');return true;}catch{setError('保存できませんでした。入力内容は残っています。容量や設定を確認してください。');return false;}}
 function registerProducts(next:ShoppingMemo){if(!storeMemo(next))return false;setMemo(next);return true;}
 function save(){if(storeMemo(memo))advance(3);}
 return <main className="shopping-page shopping-compact shopping-create"><header className="page-header"><h1>買い物メモを作成</h1></header>
 <ol className="shopping-steps" aria-label="登録の手順">{['基本情報','商品登録','完了'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined}><span className="shopping-step-number">{i+1}</span><span>{label}</span></li>)}</ol>
 {step===1&&<form className="shopping-panel task-completion-form" onSubmit={e=>{e.preventDefault();advance(2);}}><label className="form-field">メモ名（必須）<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：10月の通販・欲しいグッズ"/></label><label className="form-field">関連イベント（任意）<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">紐づけない</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><button type="submit">次へ：商品を追加</button></form>}
 {step===2&&<><section className="shopping-panel"><h2>商品を登録</h2><p>公式ページから読み込むか、手入力で追加できます。後からでも大丈夫です。</p><GoodsUrlImport initialUrl={params.get('source')||''} existing={memo.products} onAdd={products=>{const added=newGoods(memo.products,products);return registerProducts({...memo,products:[...memo.products,...added]})?added.length:false;}}/><button type="button" onClick={()=>setEditing('new')}>＋ 商品を手入力</button></section>
 {editing&&<ProductEditor product={editing==='new'?undefined:editing} onSave={p=>{if(registerProducts({...memo,products:memo.products.some(v=>v.id===p.id)?memo.products.map(v=>v.id===p.id?p:v):[...memo.products,p]}))setEditing(null);}} onCancel={()=>setEditing(null)}/>}
 {memo.products.length>0&&<p className="shopping-registration-status" role="status"><OshiIcon name="complete" size={24}/><span>{memo.products.length}件登録完了</span></p>}
 {memo.products.length>0&&<details className="shopping-added-products"><summary>追加済みの商品（{memo.products.length}件）を確認・編集</summary>{memo.products.map(p=><div className="shopping-create-product" key={p.id}><span>{p.name} {p.variant}</span><button type="button" className="secondary-button" onClick={()=>setEditing(p)}>編集</button><button type="button" className="secondary-button" onClick={()=>registerProducts({...memo,products:memo.products.filter(v=>v.id!==p.id)})}>削除</button></div>)}</details>}
 <div className="shopping-actions shopping-step-actions" aria-label="登録ステップの操作"><button type="button" className="secondary-button" onClick={()=>advance(1)}>戻る</button><button type="button" disabled={!!editing} onClick={save}>登録を完了</button></div></>}
 {step===3&&<section className="shopping-completion" aria-labelledby="shopping-completion-title">
 <div className="shopping-completion-symbol" aria-hidden="true"><OshiIcon name="complete" size={80}/></div>
 <h2 id="shopping-completion-title" ref={completionHeading} tabIndex={-1}>作成が完了しました！</h2>
 <p>買い物メモを使い始められます。</p>
 <div className="shopping-completion-summary"><h3><OshiIcon name="shopping-memo" size={28}/><span>{title}</span></h3><dl>
 <div><dt>登録商品</dt><dd>{memo.products.length}件</dd></div>
 <div><dt>購入予定</dt><dd>{totals(memo).count?`${totals(memo).count}点 ／ ${totals(memo).amount.toLocaleString('ja-JP')}円`:'後で選択'}</dd></div>
 <div><dt>購入者</dt><dd>{memo.buyers.length}名</dd></div>
 {eventId&&events.find(e=>e.id===eventId)&&<div><dt>関連イベント</dt><dd>{events.find(e=>e.id===eventId)?.title}</dd></div>}
 </dl></div>
 <div className="shopping-completion-actions"><Link className="primary-link-button" to={`/shopping/${id}`} replace>買い物メモを開く</Link><Link className="task-navigation-button" to="/" replace>ホームに戻る</Link></div>
 </section>}
 {error&&<p role="alert">{error}</p>}</main>;
}
