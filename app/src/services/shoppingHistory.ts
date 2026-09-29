import type { ShoppingMemo } from './shopping';
export interface PurchaseHistory {id:string;buyerId:string;buyerName:string;productId:string;name:string;variant:string;price:number;quantity:number;memo:string;image?:string;purchasedAt:string}
export function recordPurchases(memo:ShoppingMemo,cycle:string,now:string):ShoppingMemo{
 const history=[...(memo.purchaseHistory||[])];
 for(const buyer of memo.buyers)for(const product of memo.products){
  const order=memo.orders[buyer.id]?.[product.id],id=`${cycle}:${buyer.id}:${product.id}`,index=history.findIndex(h=>h.id===id);
  if(order?.status==='購入済み'&&order.quantity>0){
   const entry={id,buyerId:buyer.id,buyerName:buyer.name,productId:product.id,name:product.name,variant:product.variant,price:product.price,quantity:order.quantity,memo:order.memo,image:product.image,purchasedAt:index>=0?history[index].purchasedAt:now};
   if(index>=0)history[index]=entry;else history.unshift(entry);
  }else if(index>=0)history.splice(index,1);
 }
 return {...memo,purchaseCycle:cycle,purchaseHistory:history};
}
export function nextShopping(memo:ShoppingMemo,newCycle:string):ShoppingMemo{
 return {...memo,orders:{},bonuses:{},purchaseCycle:newCycle,purchaseCompletedAt:undefined};
}
