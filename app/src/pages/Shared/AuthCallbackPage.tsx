import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { finishLineLogin, readLineCallback } from '../../services/lineAuth';
export default function AuthCallbackPage(){
 const navigate=useNavigate();
 const [failed,setFailed]=useState(false);
 const [reason,setReason]=useState('');
 // Keep the original result when StrictMode reruns the effect after URL cleanup.
 const [callback]=useState(()=>readLineCallback(location.search,location.hash));
 useEffect(()=>{
  let active=true;
  async function finish(){
   try{
    const code=callback.code;
    if(callback.hasError){
     const providerCode=callback.errorCode;
     // Show only a bounded error identifier, never callback tokens or raw responses.
     if(active)setReason(`認証サービスで失敗しました（${/^[a-zA-Z0-9_-]{1,80}$/.test(providerCode)?providerCode:'provider_error'}）。`);
     throw new Error('PROVIDER_ERROR');
    }
    if(!code){
     if(active)setReason('ログインに必要な認証コードが届いていません。ログイン画面からやり直してください。');
     throw new Error('MISSING_CODE');
    }
    const target=await finishLineLogin(code);
    if(active)navigate(target,{replace:true});
   }catch(error){if(active){
    if(!(error instanceof Error)||!['PROVIDER_ERROR','MISSING_CODE'].includes(error.message)){
     const errorCode=error&&typeof error==='object'&&'code' in error?String(error.code):'';
     setReason(`ログイン情報の受け取りに失敗しました（${/^[a-zA-Z0-9_-]{1,80}$/.test(errorCode)?errorCode:'session_exchange_failed'}）。`);
    }
    window.history.replaceState(null,'','/auth/callback');setFailed(true);
   }}
  }
  void finish();return()=>{active=false;};
 },[navigate,callback]);
 return <main><h1>LINEログイン</h1><p role="status">{failed?'ログインを完了できませんでした。':'ログインを確認しています…'}</p>{failed&&<><p>{reason}</p><Link to="/shared">ログイン画面へ戻る</Link></>}</main>;
}
