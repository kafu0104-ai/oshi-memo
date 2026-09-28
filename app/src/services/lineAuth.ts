import { cloud } from './cloud';
const returnKey='oshi-memo-login-return';
export function readLineCallback(search:string,hash:string){
 const query=new URLSearchParams(search);
 const fragment=new URLSearchParams(hash.replace(/^#/,''));
 const hasError=[query,fragment].some(params=>['error','error_code','error_description'].some(key=>params.has(key)));
 const rawCode=query.get('error_code')||fragment.get('error_code')||query.get('error')||fragment.get('error')||'';
 return {code:query.get('code'),hasError,errorCode:/^[a-zA-Z0-9_-]{1,80}$/.test(rawCode)?rawCode:'provider_error'};
}
export function safeReturnPath(path:string|null):string {
 if(!path)return '/shared';
 if(path==='/settings/sync')return path;
 // Only shared pages on this origin. Never redirect to a supplied external URL.
 return /^\/shared(?:\/[a-zA-Z0-9-]+)?(?:#invite=[a-f0-9]{64})?$/.test(path)?path:'/shared';
}
export async function startLineLogin(){
 if(!cloud)throw new Error('NOT_CONFIGURED');
 sessionStorage.setItem(returnKey,safeReturnPath(location.pathname+location.hash));
 const {error}=await cloud.auth.signInWithOAuth({provider:'custom:line-oauth',options:{redirectTo:`${location.origin}/auth/callback`,scopes:'openid profile'}});
 if(error)throw error;
}
let exchange: {code:string;promise:Promise<string>}|undefined;
export function finishLineLogin(code:string):Promise<string>{
 if(exchange?.code===code)return exchange.promise;
 const promise=(async()=>{
  if(!cloud)throw new Error('NOT_CONFIGURED');
  const {error}=await cloud.auth.exchangeCodeForSession(code);
  if(error)throw error;
  const target=safeReturnPath(sessionStorage.getItem(returnKey));
  sessionStorage.removeItem(returnKey);
  return target;
 })();
 exchange={code,promise};
 return promise;
}
