import { startLineLogin } from '../../services/lineAuth';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { cloud } from '../../services/cloud';
export default function CloudGate({children,purpose='sharing'}:{children:(session:Session)=>ReactNode;purpose?:'sharing'|'personal'}) {
 const [session,setSession]=useState<Session|null>(null);
 const [ready,setReady]=useState(false);
 const [email,setEmail]=useState('');
 const [sentEmail,setSentEmail]=useState('');
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!cloud)return;
  let active=true;
  cloud.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);setReady(true);if(error)setMessage('ログイン状態を確認できませんでした。もう一度ログインしてください。');}});
  const {data}=cloud.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);setReady(true);}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 if(!cloud)return <section className="shopping-panel"><h2>友人との共有は準備中です</h2><p>クラウドの接続設定が完了すると、ここからログインして共有できます。個人用の買い物メモは引き続き使えます。</p></section>;
 if(!ready)return <p role="status">ログイン状態を確認しています…</p>;
 if(session)return <>{children(session)}</>;
 return <section className="shopping-panel shared-login"><h2>{purpose==='personal'?'自分のデータを同期するためにログイン':'共有するためにログイン'}</h2><p>{purpose==='personal'?'PCとスマホで同じLINEアカウントを使うと、個人データを保存・読み込みできます。':'LINEでログインすると、友人と買い物メモを共有できます。'}</p><button className="line-login-button" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{await startLineLogin();}catch{setMessage('LINEログインを開始できませんでした。接続とブラウザの保存設定を確認してください。');setBusy(false);}}}>LINEでログイン</button><details><summary>メールでログインする</summary><p>メールログインを設定済みの方はこちら。</p>
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const {error}=await cloud!.auth.signInWithOtp({email:email.trim()});if(error)throw error;setSentEmail(email.trim());setMessage('確認コードを送信しました。メールを確認してください。');}catch{setMessage('メールを送信できませんでした。アドレスと接続を確認し、少し待ってからお試しください。');}finally{setBusy(false);}}}>
 <label>メールアドレス<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button disabled={busy}>確認コードを送る</button></form>
 {sentEmail&&<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const {error}=await cloud!.auth.verifyOtp({email:sentEmail,token:code.trim(),type:'email'});if(error)throw error;}catch{setMessage('確認コードが正しくないか、有効期限が切れています。');}finally{setBusy(false);}}}><p>{sentEmail} に届いたコード</p><label>確認コード<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required/></label><button disabled={busy}>ログイン</button></form>}
 </details><p role="status">{message}</p></section>;
}
