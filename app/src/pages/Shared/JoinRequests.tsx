import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import CloudGate from './CloudGate';
import { cloud, cloudError } from '../../services/cloud';
import type { SharedMember } from '../../services/sharedShopping';
interface JoinLink {id:string;label:string;role:string;expires_at:string;used_at:string|null;revoked:boolean}
interface JoinRequest {id:string;room_id:string;link_id:string;user_id:string;display_name:string;status:string;created_at:string}
export function InviteManager({id,members,onChange}:{id:string;members:SharedMember[];onChange:()=>void}){
 const [message,setMessage]=useState('');const [link,setLink]=useState('');const [links,setLinks]=useState<JoinLink[]>([]);const [requests,setRequests]=useState<JoinRequest[]>([]);const [busy,setBusy]=useState(false);const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;let loading=false;
  async function load(){if(loading)return;loading=true;try{
   const [a,b]=await Promise.all([cloud!.from('shopping_join_links').select('id,label,role,expires_at,used_at,revoked').eq('room_id',id),cloud!.from('shopping_join_requests').select('*').eq('room_id',id).eq('status','pending')]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   if(active){setLinks(a.data??[]);setRequests(b.data??[]);}
  }catch(error){if(active)setMessage(cloudError(error));}finally{loading=false;}}
  void load();const timer=window.setInterval(load,10000);return()=>{active=false;window.clearInterval(timer);};
 },[id,refresh]);
 async function action(fn:()=>PromiseLike<{error:unknown}>){setBusy(true);try{const {error}=await fn();if(error)throw error;setMessage('共有設定を更新しました。');setRefresh(x=>x+1);onChange();}catch(error){setMessage(cloudError(error));}finally{setBusy(false);}}
 return <section className="shopping-panel"><h2>友人の招待・共有管理</h2><p>リンクから参加申請を受け取り、あなたが承認した人だけが参加できます。リンクは7日間有効で、1人を承認すると使用済みになります。</p><form className="shared-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);try{const {data,error}=await cloud!.rpc('create_shopping_join_link',{p_id:id,p_label:String(f.get('label')),p_role:String(f.get('role'))});if(error)throw error;setLink(`${location.origin}/shared/join#invite=${data}`);setMessage('招待リンクを作成しました。相手にリンクを送ってください。');setRefresh(x=>x+1);}catch(error){setMessage(cloudError(error));}finally{setBusy(false);}}}><label>招待する相手の名前（あなた用の目印）<input name="label" maxLength={80} required placeholder="例：とこさん"/></label><label>承認後にできること<select name="role"><option value="viewer">見るだけ</option><option value="editor">一緒に編集（共有メモ全体）</option></select></label><button disabled={busy}>招待リンクを作成</button></form>
 {link&&<label>相手に送る招待リンク<input readOnly value={link} onFocus={e=>e.target.select()}/><span>選択してコピーし、LINEなどで送ってください。</span></label>}<p role="status">{message}</p>
 <h3>参加申請（{requests.length}件）</h3><p>表示名は申請者が入力した名前です。LINEの会話などで本人の申請か確認してから承認してください。</p>{requests.map(r=>{const invite=links.find(l=>l.id===r.link_id);return <div className="shopping-panel" key={r.id}><strong>{r.display_name}</strong><p>招待の目印：{invite?.label??'確認中'} ／ {invite?.role==='editor'?'共同編集':'閲覧のみ'}</p><div className="shopping-actions"><button disabled={busy||!invite||invite.revoked||!!invite.used_at||new Date(invite.expires_at)<=new Date()} onClick={()=>void action(()=>cloud!.rpc('decide_shopping_join',{p_request:r.id,p_approve:true}))}>承認する</button><button disabled={busy} onClick={()=>void action(()=>cloud!.rpc('decide_shopping_join',{p_request:r.id,p_approve:false}))}>承認しない</button></div></div>;})}
 <h3>参加している人</h3>{members.map(m=><div className="shopping-actions" key={m.user_id}><span>{m.display_name}（{m.role==='owner'?'管理者':m.role==='editor'?'共同編集':'閲覧のみ'}）</span>{m.role!=='owner'&&<button disabled={busy} onClick={()=>{if(window.confirm(`${m.display_name}さんとの共有を解除しますか？`))void action(()=>cloud!.rpc('remove_shopping_member',{p_id:id,p_user:m.user_id}));}}>共有を解除</button>}</div>)}
 <h3>使用できる招待リンク</h3>{links.filter(i=>!i.used_at&&!i.revoked&&new Date(i.expires_at)>new Date()).map(i=><div className="shopping-actions" key={i.id}><span>{i.label}（{i.role==='editor'?'共同編集':'閲覧のみ'}）</span><button disabled={busy} onClick={()=>void action(()=>cloud!.rpc('revoke_shopping_join_link',{p_id:id,p_link:i.id}))}>招待を取り消す</button></div>)}</section>;
}
export function MyJoinRequests({userId}:{userId:string}){
 const [requests,setRequests]=useState<JoinRequest[]>([]);const [message,setMessage]=useState('');
 useEffect(()=>{let active=true;let loading=false;async function load(){if(loading)return;loading=true;try{const {data,error}=await cloud!.from('shopping_join_requests').select('*').eq('user_id',userId).order('created_at',{ascending:false});if(error)throw error;if(active){setRequests(data??[]);setMessage('');}}catch(error){if(active)setMessage(cloudError(error));}finally{loading=false;}}void load();const timer=window.setInterval(load,10000);return()=>{active=false;window.clearInterval(timer);};},[userId]);
 if(!requests.length&&!message)return null;
 return <section className="shopping-panel"><h2>あなたの参加申請</h2><p role="status">{message}</p>{requests.map(r=><div className="shopping-actions" key={r.id}><span>{new Date(r.created_at).toLocaleDateString('ja-JP')} ／ {r.display_name}：{r.status==='pending'?'承認待ち':r.status==='approved'?'承認済み':'参加できません（管理者に確認してください）'}</span>{r.status==='approved'&&<Link to={`/shared/${r.room_id}`}>買い物メモを開く</Link>}</div>)}</section>;
}
export function JoinShoppingPage(){
 const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('invite')??'');
 return <main className="shared-page"><h1>買い物メモへの招待</h1><CloudGate>{session=><JoinForm key={session.user.id} token={token} session={session}/>}</CloudGate></main>;
}
function JoinForm({token,session}:{token:string;session:Session}){
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [requested,setRequested]=useState(false);
 if(!/^[a-f0-9]{64}$/.test(token))return <p>招待リンクが見つかりません。友人から届いたリンクを開いてください。</p>;
 return <section className="shopping-panel"><p>管理者が承認すると、共有の買い物メモが開けます。</p>{!requested&&<form className="shared-form" onSubmit={async e=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get('name')).trim();setBusy(true);try{const {error}=await cloud!.rpc('request_shopping_join',{p_token:token,p_name:name});if(error)throw error;setRequested(true);setMessage('参加申請を送信しました。管理者の承認をお待ちください。');}catch(error){setMessage(cloudError(error));}finally{setBusy(false);}}}><label>友人があなたと分かる名前<input name="name" maxLength={80} required/></label><button disabled={busy}>参加を申請する</button></form>}<p role="status">{message}</p><MyJoinRequests userId={session.user.id}/><Link to="/shared">共有一覧へ戻る</Link><p><button onClick={async()=>{const {error}=await cloud!.auth.signOut();if(error)setMessage('ログアウトできませんでした。もう一度お試しください。');}}>別のアカウントでログインする</button></p></section>;
}
