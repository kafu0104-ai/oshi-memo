import { enrichOfficialPage } from './sites-worker.mjs';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { Plugin, Connect } from 'vite';

// Reject internal destinations, including on every redirect; pin the checked DNS answer.
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) ||
      (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0||b===2)) ||
      (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19||b===51&&c===100)) ||
      (a===203&&b===0&&c===113));
  }
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !/^200[12]:/i.test(address);
}
export async function readOfficialPage(input: string, redirects=0, image=false, scopeOrigin?:string): Promise<{html:string;url:string}> {
  const url=new URL(input);
  if(url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443')) throw new Error('公開されているHTTPSのURLを入力してください。');
  url.hash='';
  if(scopeOrigin && url.origin!==scopeOrigin)throw new Error('別サイトへの転送は探索しません。');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const addresses=await lookup(host,{all:true});
  if(!addresses.length || addresses.some(item=>!publicAddress(item.address))) throw new Error('このURLは読み込めません。公式サイトの公開URLを入力してください。');
  return new Promise((resolve,reject)=>{
    const req=request(url,{headers:{'User-Agent':'OshiMemo-EventImport/1.0','Accept':'text/html,application/xhtml+xml','Accept-Encoding':'identity'},lookup:(_hostname,options,callback)=>options.all ? callback(null,[addresses[0]]) : callback(null,addresses[0].address,addresses[0].family)},res=>{
      const status=res.statusCode ?? 500;
      if([301,302,303,307,308].includes(status) && res.headers.location){
        res.resume();
        if(redirects>=3){reject(new Error('転送が多すぎるため読み込めません。'));return;}
        readOfficialPage(new URL(res.headers.location,url).href,redirects+1,image,scopeOrigin).then(resolve,reject);return;
      }
      if(status!==200 || !(image ? /^image\/(png|jpeg|webp)(;|$)/i : /text\/html|application\/xhtml\+xml/i).test(res.headers['content-type'] ?? '')){
        res.resume();reject(new Error('ページを読み込めません。公開されているWebページのURLを確認してください。'));return;
      }
      const chunks:Buffer[]=[];let size=0;
      res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>(image?8_000_000:1_500_000)){res.destroy();reject(new Error('ページが大きすぎるため読み込めません。'));}else chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>{
        const bytes=Buffer.concat(chunks);
        if(image){resolve({html:`data:${res.headers['content-type']?.split(';')[0]};base64,${bytes.toString('base64')}`,url:url.href});return;}
        const charset=res.headers['content-type']?.match(/charset=([\w-]+)/i)?.[1] ?? bytes.subarray(0,4096).toString().match(/charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
        try{resolve({html:new TextDecoder(charset).decode(bytes),url:url.href});}catch{reject(new Error('ページの文字コードを読み取れません。'));}
      });
    });
    const timer=setTimeout(()=>req.destroy(new Error('読み込みがタイムアウトしました。')),10000);
    req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
  });
}
export function officialPagePlugin():Plugin {
  const middleware: Connect.NextHandleFunction = (req,res,next)=>{
    const path=req.url?.split('?')[0];
    if(path!=='/api/official-page'&&path!=='/api/goods-image')return next();
    const reply=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
    if(req.method!=='POST'){reply(405,{error:'POSTのみ利用できます。'});return;}
    let sameOrigin=false;
    try{sameOrigin=!!req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;}catch{/* invalid origin */}
    if(!sameOrigin){reply(403,{error:'この画面から読み込んでください。'});return;}
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>4096)req.destroy();});
    req.on('end',async()=>{try{const {url,scopeOrigin}=JSON.parse(body);if(typeof url!=='string'||url.length>2048)throw new Error('URLを確認してください。');if(scopeOrigin!==undefined&&(typeof scopeOrigin!=='string'||new URL(scopeOrigin).origin!==scopeOrigin))throw new Error('探索範囲が不正です。');const page=await readOfficialPage(url,0,path==='/api/goods-image',scopeOrigin);reply(200,path==='/api/goods-image'?page:await enrichOfficialPage(page));}catch(error){reply(400,{error:error instanceof Error && /[ぁ-んァ-ン一-龯]/.test(error.message)?error.message:'ページを読み込めませんでした。URLと接続を確認してください。'});}});
  };
  return {name:'official-page-import',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
