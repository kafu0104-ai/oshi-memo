import type { GoodsStatus } from "../types/Goods";
import type { ProductSales } from "./productSales";
export interface ShoppingProduct extends ProductSales {
  importKey?: string;
  id: string; name: string; variant: string; price: number; category: string;
  limit: number | null;
  limitText?: string; priceText?: string; sourceUrl?: string; sourceNote?: string; image?: string; releaseDate?: string; releaseMonth?: string;
  unit?: string | null; character?: string | null; searchText?: string; random?: boolean;
}
export interface ShoppingOrder { quantity: number; status: GoodsStatus; memo: string }
export interface ShoppingMemo {
  products: ShoppingProduct[];
  buyers: {id:string; name:string}[];
  orders: Record<string, Record<string, ShoppingOrder>>;
  soldOut: string[];
  bonusThreshold: number;
  bonusLabels: string[];
  bonuses: Record<string, number[]>;
}
export const shoppingKey = (eventId:string) => `oshi-memo-shopping-${eventId}`;
export function emptyShopping(): ShoppingMemo {
  return {products:[],buyers:[{id:"self",name:"自分"}],orders:{},soldOut:[],bonusThreshold:0,bonusLabels:["特典"],bonuses:{}};
}
export function loadShopping(eventId:string): ShoppingMemo {
  const raw = localStorage.getItem(shoppingKey(eventId));
  if (!raw) return emptyShopping();
  const data = JSON.parse(raw) as ShoppingMemo;
  if (!Array.isArray(data.products) || !Array.isArray(data.buyers) || !data.orders || !Array.isArray(data.soldOut) || !Array.isArray(data.bonusLabels) || !data.bonuses) throw new Error("買い物メモを読み込めませんでした。");
  return data;
}
export function saveShopping(eventId:string, memo:ShoppingMemo) { localStorage.setItem(shoppingKey(eventId),JSON.stringify(memo)); }
export function orderFor(memo:ShoppingMemo,buyer:string,product:string):ShoppingOrder {
  return memo.orders[buyer]?.[product] ?? {quantity:0,status:"未購入",memo:""};
}
export function totals(memo:ShoppingMemo,buyer?:string) {
  let amount=0, count=0, purchased=0;
  for (const b of memo.buyers.filter(b => !buyer || b.id===buyer)) {
    for (const p of memo.products) {
      const o=orderFor(memo,b.id,p.id);
      if (o.status === "購入済み") purchased+=p.price*o.quantity;
      if ((o.status === "見送り" || o.status === "売切れ") || (memo.soldOut.includes(p.id) && o.status !== "購入済み")) continue;
      amount+=p.price*o.quantity;count+=o.quantity;
    }
  }
  return {amount,count,purchased,bonus:memo.bonusThreshold>0 ? Math.floor(amount/memo.bonusThreshold) : 0};
}

export function hasShoppingMemo(eventId:string): boolean {
  try { return localStorage.getItem(shoppingKey(eventId)) !== null; }
  catch { return false; }
}
