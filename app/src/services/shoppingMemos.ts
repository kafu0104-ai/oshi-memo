import type { Event } from '../types/Event';
import { loadShopping, shoppingKey, type ShoppingMemo } from './shopping';
export interface ShoppingMemoInfo { title:string; eventId?:string }
export interface ShoppingMemoSummary extends ShoppingMemoInfo { id:string; eventTitle?:string }
export function memoInfo(id:string,memo:ShoppingMemo,events:Event[]):ShoppingMemoInfo {
  return memo.info ?? {title:events.find(e=>e.id===id)?.title ?? '買い物メモ',eventId:events.some(e=>e.id===id)?id:undefined};
}
export function listShoppingMemos(events:Event[]) {
  const items:ShoppingMemoSummary[]=[];const errors:string[]=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!key?.startsWith('oshi-memo-shopping-'))continue;
    const id=key.slice('oshi-memo-shopping-'.length);
    try { const info=memoInfo(id,loadShopping(id),events);items.push({id,...info,eventTitle:events.find(e=>e.id===info.eventId)?.title}); }
    catch { errors.push(id); }
  }
  return {items,errors};
}
export function shoppingForEvent(eventId:string,events:Event[]) {return listShoppingMemos(events).items.filter(m=>m.eventId===eventId);}
// Preserve legacy titles before an event is deleted; memo IDs and contents never move.
export function preserveEventShopping(event:Event) {
 const raw=localStorage.getItem(shoppingKey(event.id));if(!raw)return;
 const memo=loadShopping(event.id);if(!memo.info)localStorage.setItem(shoppingKey(event.id),JSON.stringify({...memo,info:{title:event.title,eventId:event.id}}));
}
