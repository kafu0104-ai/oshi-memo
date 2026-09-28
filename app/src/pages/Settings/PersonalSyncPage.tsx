import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router';
import CloudGate from '../Shared/CloudGate';
import { cloud } from '../../services/cloud';
import { captureSnapshot, exportSnapshot, restoreSnapshot, sameSnapshot, snapshotSummary, validateSnapshot, type PersonalSnapshot } from '../../services/personalSnapshot';
import { applyTheme, loadTheme } from '../../services/themes';

type Remote={payload:PersonalSnapshot;revision:number;updated_at:string};
function SyncControls({session}:{session:Session}){
 const [remote,setRemote]=useState<Remote|null>(null);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [confirm,setConfirm]=useState<'upload'|'download'|null>(null);
 const [local,setLocal]=useState(()=>captureSnapshot());
 const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const baselineKey=`oshi-memo-sync-revision-${session.user.id}`;
 const account=session.user.user_metadata.name||session.user.user_metadata.full_name||session.user.email||'LINEアカウント';
 const failure=(error:unknown)=>{
  const message=error&&typeof error==='object'&&'message' in error?String(error.message):'';
  return message.includes('SYNC_CONFLICT')?'別の端末で更新されています。上書きを止めました。最新の保存状況を確認してください。':message.includes('LOCAL_CHANGED')?'この端末のデータが変更されたため操作を止めました。もう一度確認してください。':'同期できませんでした。接続・保存容量・同期用SQLの設定を確認してください。この画面から再試行できます。';
 };
 async function readRemote(){
  const {data,error}=await cloud!.from('personal_snapshots').select('payload,revision,updated_at').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;
  return data?{...data,payload:validateSnapshot(data.payload)}:null;
 }
 useEffect(()=>{
  let active=true;
  void readRemote().then(data=>{if(active){setRemote(data);setReady(true);}}).catch(error=>{if(active)setMessage(failure(error));});
  return()=>{active=false;};
 // Session identity is keyed by the parent; never reuse another account's revision.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function refresh(){setBusy(true);setConfirm(null);try{setRemote(await readRemote());setLocal(captureSnapshot());setReady(true);setMessage('保存状況を確認しました。');}catch(error){setMessage(failure(error));}finally{setBusy(false);}}
 const canUpload=ready&&(!remote||Number(localStorage.getItem(baselineKey))===remote.revision||sameSnapshot(local,remote.payload));
 async function perform(){
  setBusy(true);
  try{
   const {data:auth,error:authError}=await cloud!.auth.getSession();
   if(!active.current||authError||auth.session?.user.id!==session.user.id)throw new Error('LOGIN_REQUIRED');
   if(!sameSnapshot(local,captureSnapshot()))throw new Error('LOCAL_CHANGED');
   if(confirm==='upload'){
    if(!canUpload)throw new Error('SYNC_CONFLICT');
    const {data,error}=await cloud!.rpc('save_personal_snapshot',{p_payload:local,p_revision:remote?.revision||0});
    if(error)throw error;
    if(!active.current)return;
    localStorage.setItem(baselineKey,String(data));
    setRemote({payload:local,revision:Number(data),updated_at:new Date().toISOString()});
    setMessage('自分のアカウントに保存しました。他の端末で「読み込む」を押すと反映されます。');
   }else if(confirm==='download'&&remote){
    const latest=await readRemote();
    if(!active.current)return;
    if(!latest||latest.revision!==remote.revision)throw new Error('SYNC_CONFLICT');
    if(!sameSnapshot(local,captureSnapshot()))throw new Error('LOCAL_CHANGED');
    restoreSnapshot(latest.payload);localStorage.setItem(baselineKey,String(latest.revision));
    applyTheme(loadTheme());setLocal(captureSnapshot());
    setMessage('この端末に読み込みました。置き換え前のデータはこのブラウザにバックアップしています。');
   }
  }catch(error){setMessage(failure(error));}finally{setBusy(false);setConfirm(null);}
 }
 return <section className="shopping-panel personal-sync-panel">
  <p className="sync-account">ログイン中：{account}</p>
  <p>この端末：{snapshotSummary(local)}</p>
  <p>{ready?(remote?`クラウド：${snapshotSummary(remote.payload)}（${new Date(remote.updated_at).toLocaleString()} 保存）`:'クラウドにはまだ保存されていません。'): 'クラウドの保存状況を確認しています。'}</p>
  <p>イベント・チケット・買い物メモ・交換／譲渡・同行者・タグ・テーマをまとめて同期します。自動同期ではありません。編集した端末で保存し、別の端末で読み込んでください。</p>
  <div className="sync-tools"><button disabled={busy} onClick={()=>void refresh()}>保存状況を確認</button>{' '}
  <button disabled={busy} onClick={()=>exportSnapshot(captureSnapshot())}>バックアップを保存</button></div>
  <div className="sync-actions"><button disabled={busy||!canUpload} onClick={()=>setConfirm('upload')}>クラウドへ保存</button>{' '}<button disabled={busy||!ready||!remote} onClick={()=>setConfirm('download')}>この端末に読み込む</button></div>
  {ready&&remote&&!canUpload&&<p>クラウドとこの端末に異なるデータがあります。誤って上書きしないよう、保存を止めています。この端末のバックアップをダウンロードしてからクラウドを読み込んでください。自動での結合は行いません。</p>}
  {confirm&&<section className="sync-confirm" role="alert"><p>{confirm==='upload'?`${account} の個人用クラウドデータを、この端末の内容で保存します。友人には共有されません。`:'この端末の個人データをクラウドの内容に置き換えます。必要なデータは先にバックアップをダウンロードしてください。'}</p><button disabled={busy} onClick={()=>void perform()}>{confirm==='upload'?'保存する':'置き換えて読み込む'}</button>{' '}<button disabled={busy} onClick={()=>setConfirm(null)}>キャンセル</button></section>}
  <p className="sync-status" role="status">{busy?'処理中…':message}</p>
  <details><summary>バックアップから戻す</summary><p>選んだファイルの内容で、この端末の個人データを置き換えます。クラウドには送信しません。</p><input aria-label="バックアップファイル" type="file" accept=".json,application/json" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const snapshot=validateSnapshot(JSON.parse(await file.text()));if(!window.confirm(`${snapshotSummary(snapshot)} をこの端末に復元しますか？`))return;restoreSnapshot(snapshot);applyTheme(loadTheme());setLocal(captureSnapshot());setMessage('バックアップを復元しました。');}catch{setMessage('復元できませんでした。バックアップ形式と保存容量を確認してください。');}finally{e.target.value='';}}}/></details>
 </section>;
}
export default function PersonalSyncPage(){return <main className="personal-sync-page"><Link to="/settings">← 設定へ</Link><header className="page-header"><h1>自分の端末と同期</h1><p>PCとスマホで同じLINEアカウントを使ってください。個人用データは本人だけがアクセスできます。</p></header><CloudGate purpose="personal">{session=><SyncControls key={session.user.id} session={session}/>}</CloudGate></main>;}
