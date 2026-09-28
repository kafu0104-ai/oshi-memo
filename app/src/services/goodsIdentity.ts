import type { ShoppingProduct } from './shopping';
type Identity = {name:string;variant?:string;sourceUrl?:string;importKey?:string};
export function goodsKey(product:Identity):string {
 if(product.importKey)return product.importKey;
 let source=product.sourceUrl||'';
 try{const url=new URL(source);source=url.origin+url.pathname.replace(/\/$/,'');}catch{/* manual goods have no source */}
 const normalize=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim();
 return JSON.stringify([source,normalize(product.name),normalize(product.variant||'')]);
}
export function newGoods(existing:ShoppingProduct[],incoming:ShoppingProduct[]):ShoppingProduct[]{
 const keys=new Set(existing.map(goodsKey));
 return incoming.filter(product=>{const key=goodsKey(product);if(keys.has(key))return false;keys.add(key);return true;}).map(product=>({...product,importKey:goodsKey(product)}));
}
