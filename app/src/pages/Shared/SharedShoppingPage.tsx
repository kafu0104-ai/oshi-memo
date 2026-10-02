import { listShoppingMemos } from "../../services/shoppingMemos";
import { InviteManager, MyJoinRequests } from './JoinRequests';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import CloudGate from './CloudGate';
import { cloud, cloudError } from '../../services/cloud';
import { readRoom, sharedSeed, type SharedMember, type SharedRoom } from '../../services/sharedShopping';
import { loadEvents } from '../../services/storage';
import { loadShopping, orderFor, totals, type ShoppingMemo, type ShoppingOrder } from '../../services/shopping';
import { generateId } from '../../services/id';
import ProductEditor from '../Shopping/ProductEditor';
import type { ShoppingProduct } from '../../services/shopping';
import { GOODS_STATUS } from '../../types/Goods';
const money=(amount:number)=>`${amount.toLocaleString('ja-JP')}円`;
export default function SharedShoppingPage(){
 const {roomId}=useParams();
 return <main className="shared-page"><Link to="/shopping">← 買い物メモへ</Link><header className="page-header"><h1>友人と共有する買い物メモ</h1></header><CloudGate>{session=>roomId?<SharedEditor key={`${session.user.id}:${roomId}`} id={roomId} session={session}/>:<SharedList key={session.user.id} session={session}/>}</CloudGate></main>;
}
function SharedList({session}:{session:Session}){
 const [rooms,setRooms]=useState<Pick<SharedRoom,'id'|'title'|'updated_at'>[]>([]);
 const [message,setMessage]=useState('読み込み中…');
 const [busy,setBusy]=useState(false);
 const [includeOrders,setIncludeOrders]=useState(false);
 const navigate=useNavigate();
 const events=listShoppingMemos(loadEvents()).items;
 useEffect(()=>{let active=true;cloud!.from('shopping_rooms').select('id,title,updated_at').order('updated_at',{ascending:false}).then(({data,error})=>{if(active){setRooms(data??[]);setMessage(error?cloudError(error):'');}});return()=>{active=false;};},[]);
 return <><p>ログイン中：{session.user.email || (typeof session.user.user_metadata.name==='string'?session.user.user_metadata.name:'LINEアカウント')}</p><button type="button" onClick={async()=>{const {error}=await cloud!.auth.signOut();if(error)setMessage('ログアウトできませんでした。もう一度お試しください。');}}>ログアウト</button>
 <p role="status">{message}</p><div className="management-links">{rooms.map(r=><Link className="management-card" key={r.id} to={`/shared/${r.id}`}><strong>{r.title}</strong><span>共有中の買い物メモを開く</span><span aria-hidden="true">›</span></Link>)}</div>
 {!rooms.length&&!message&&<p>まだ共有中の買い物メモはありません。作成するか、友人から届いた招待リンクで参加できます。</p>}
 <MyJoinRequests userId={session.user.id}/><section className="shopping-panel"><h2>買い物メモを共有する</h2><p>選んだイベントの商品を使って、共有用の買い物メモを作ります。作成後はこの画面から全員で同じ内容を編集します。個人用とは別に保存されます。</p>
 {events.length?<form className="shared-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const event=events.find(v=>v.id===f.get('event'));if(!event)return;setBusy(true);try{const name=String(f.get('name')).trim();const memo=sharedSeed(loadShopping(event.id),name,includeOrders);const {data,error}=await cloud!.rpc('create_shopping_room',{p_title:event.title,p_memo:memo,p_name:name});if(error)throw error;navigate(`/shared/${data}`);}catch(error){setMessage(cloudError(error));}finally{setBusy(false);}}}>
 <label>買い物メモ<select name="event" required>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label>共有する相手に表示するあなたの名前<input name="name" required maxLength={80}/></label>
 <label className="shared-checkbox"><input type="checkbox" checked={includeOrders} onChange={e=>setIncludeOrders(e.target.checked)}/>登録済みの購入者・数量・購入状況・商品ごとのメモ・特典の振り分けも共有する</label><p>チェックを外すと商品一覧と特典設定だけを取り込みます。チケット・精算・イベントの個人メモは共有しません。</p><button disabled={busy}>{busy?'作成中…':'共有用の買い物メモを作成'}</button></form>:<p>買い物メモを作成すると、共有用のメモを作れます。</p>}</section></>;
}
function SharedEditor({id,session}:{id:string;session:Session}){
 const [room,setRoom]=useState<SharedRoom|null>(null);
 const [members,setMembers]=useState<SharedMember[]>([]);
 const [draft,setDraft]=useState<ShoppingMemo|null>(null);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('読み込み中…');
 const [search,setSearch]=useState('');
 const [editing,setEditing]=useState<ShoppingProduct|'new'|null>(null);
 const [buyer,setBuyer]=useState('all');
 const [shown,setShown]=useState(30);
 const [refresh,setRefresh]=useState(0);
 const [denied,setDenied]=useState(false);
 const dirty=draft!==null;
 useEffect(()=>{
  let active=true;let inFlight=false;
  async function update(){
   if(inFlight||saving)return;inFlight=true;
   try{
    const next=await readRoom(id);
    const {data,error}=await cloud!.from('shopping_members').select('*').eq('room_id',id);
    if(error)throw error;
    if(active){setDenied(false);setMembers(data as SharedMember[]);if(!dirty){setRoom(old=>!old||next.revision>=old.revision?next:old);setMessage('最新の保存内容を表示しています。');}}
   }catch(error){if(active){setMessage(cloudError(error));setDenied(true);}}
   finally{inFlight=false;}
  }
  void update();const timer=window.setInterval(update,10000);
  return()=>{active=false;window.clearInterval(timer);};
 },[id,dirty,saving,refresh]);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  const guard=(e:MouseEvent)=>{
   const anchor=e.target instanceof Element?e.target.closest('a'):null;
   if(anchor&&anchor.href!==location.href&&!window.confirm('未保存の変更を破棄して移動しますか？')){e.preventDefault();e.stopPropagation();}
  };
  window.addEventListener('beforeunload',warn);document.addEventListener('click',guard,true);
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',guard,true);};
 },[dirty]);
 const role=members.find(m=>m.user_id===session.user.id)?.role;
 if(!room)return <><p role="status">{message}</p><button onClick={()=>setRefresh(x=>x+1)}>再読み込み</button><Link to="/shared">共有一覧へ戻る</Link></>;
 const memo=draft??room.memo;
 const editable=!denied&&(role==='owner'||role==='editor');
 const buyers=memo.buyers.filter(b=>buyer==='all'||b.id===buyer);
 const filtered=memo.products.filter(p=>`${p.name} ${p.variant}`.includes(search));
 function change(next:ShoppingMemo){setDraft(next);setMessage('未保存の変更があります。「変更を保存」で全員に反映します。');}
 function orderChange(b:string,p:string,patch:Partial<ShoppingOrder>){change({...memo,orders:{...memo.orders,[b]:{...memo.orders[b],[p]:{...orderFor(memo,b,p),...patch}}}});}
 async function save(){
  if(!draft||!room)return;setSaving(true);
  try{const {data,error}=await cloud!.rpc('save_shopping_room',{p_id:id,p_revision:room.revision,p_memo:draft});if(error)throw error;setRoom({...room,memo:draft,revision:data,updated_at:new Date().toISOString(),updated_by:members.find(m=>m.user_id===session.user.id)?.display_name??''});setDraft(null);setMessage('保存しました。共有相手にも反映されます。');}
  catch(error){setMessage(cloudError(error));}finally{setSaving(false);}
 }
 return <><Link to="/shared">← 共有一覧へ戻る</Link><h2>{room.title}</h2><p>{role==='viewer'?'閲覧のみ':role==='owner'?'あなたが管理者です':'共同編集できます'} ／ 最終更新：{room.updated_by}（{new Date(room.updated_at).toLocaleString('ja-JP')}）</p>
 <section className="shopping-panel shared-save"><p role="status">{message}</p><p>保存した内容は約10秒ごとに更新されます。編集中はあなたの入力を保持します。</p><div className="shopping-actions"><button disabled={!dirty||!editable||saving} onClick={save}>{saving?'保存中…':'変更を保存'}</button><button disabled={saving} onClick={()=>{if(dirty&&!window.confirm('未保存の変更を破棄し、最新の内容を読み直しますか？'))return;setDraft(null);setRefresh(x=>x+1);}}>最新の内容を読み直す</button></div>{dirty&&<p>この画面を離れる前に保存してください。</p>}</section>
 <div className="shopping-summary"><div><span>全員分の点数</span><strong>{totals(memo).count}点</strong></div><div><span>全員分の合計</span><strong>{money(totals(memo).amount)}</strong></div><div><span>購入済み</span><strong>{money(totals(memo).purchased)}</strong></div></div>
 <fieldset disabled={!editable||saving} className="shared-fields"><legend>購入者</legend><div className="shopping-tabs">{memo.buyers.map(b=><span key={b.id}>{b.name}</span>)}</div><form className="shopping-inline-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();if(!name)return;change({...memo,buyers:[...memo.buyers,{id:generateId(),name}]});e.currentTarget.reset();}}><input name="name" maxLength={80} required aria-label="追加する購入者名" placeholder="購入者名"/><button>購入者を追加</button></form></fieldset>
 <section className="shopping-panel shopping-filters"><label>商品を検索<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>購入者<select value={buyer} onChange={e=>setBuyer(e.target.value)}><option value="all">全員分</option>{memo.buyers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></section>
 <fieldset className="shared-fields" disabled={!editable||saving}><legend>商品と購入状況</legend><div className="shopping-actions"><button type="button" onClick={()=>setEditing('new')}>＋ 商品を追加</button></div>
 {editing&&<ProductEditor key={editing==='new'?'new':editing.id} product={editing==='new'?undefined:editing} onCancel={()=>setEditing(null)} onSave={p=>{change({...memo,products:editing==='new'?[...memo.products,p]:memo.products.map(old=>old.id===p.id?p:old)});setEditing(null);}}/>}
 <div className="shopping-products">{filtered.slice(0,shown).map(p=><article className="shopping-product" key={p.id}><div className="shopping-product-info"><h3>{p.name} {p.variant}</h3><button type="button" onClick={()=>setEditing(p)}>商品を編集</button><p>{money(p.price)} ／ {p.limitText??(p.limit?`購入上限 ${p.limit}個`:'購入上限の記載なし')}</p><label className="shared-checkbox"><input type="checkbox" checked={memo.soldOut.includes(p.id)} onChange={e=>change({...memo,soldOut:e.target.checked?[...memo.soldOut,p.id]:memo.soldOut.filter(x=>x!==p.id)})}/>売切れ</label>{buyers.map(b=>{const o=orderFor(memo,b.id,p.id);return <div className="shared-order" key={b.id}><strong>{b.name}</strong><label>数量<input type="number" min={0} max={p.limit??9999} step={1} value={o.quantity} onChange={e=>orderChange(b.id,p.id,{quantity:Math.max(0,Math.min(p.limit??9999,Math.floor(Number(e.target.value))||0))})}/></label><label>購入状況<select value={o.status} onChange={e=>orderChange(b.id,p.id,{status:e.target.value as ShoppingOrder['status']})}>{GOODS_STATUS.map(s=><option key={s}>{s}</option>)}</select></label><label>共有メモ<input value={o.memo} onChange={e=>orderChange(b.id,p.id,{memo:e.target.value})}/></label></div>;})}</div></article>)}</div></fieldset>
 {filtered.length>shown&&<button onClick={()=>setShown(n=>n+30)}>商品をもっと見る</button>}{!filtered.length&&<p>表示する商品がありません。絞り込みを確認するか、編集できる人が「商品を追加」から登録してください。</p>}
 {role==='owner'&&!denied&&<InviteManager id={id} members={members} onChange={()=>setRefresh(x=>x+1)}/>}
 </>;
}
