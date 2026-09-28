import { emptyShopping, type ShoppingMemo } from './shopping';
import { cloud } from './cloud';
export interface SharedRoom {id:string;title:string;memo:ShoppingMemo;revision:number;updated_at:string;updated_by:string;owner_id:string}
export interface SharedMember {room_id:string;user_id:string;role:'owner'|'editor'|'viewer';display_name:string}
export function sharedSeed(memo:ShoppingMemo,name:string,includeOrders:boolean):ShoppingMemo {
 if(includeOrders)return {...memo,buyers:memo.buyers.map(b=>b.id==='self'?{...b,name}:b)};
 return {...emptyShopping(),products:memo.products,buyers:[{id:'self',name}],bonusThreshold:memo.bonusThreshold,bonusLabels:memo.bonusLabels};
}
function record(value:unknown): value is Record<string,unknown> {
 return !!value && typeof value==='object' && !Array.isArray(value);
}
function amount(value:unknown): value is number {return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
export function validMemo(value:unknown): value is ShoppingMemo {
 if(!record(value))return false;
 const m=value;
 return Array.isArray(m.products)&&m.products.every(p=>record(p)&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.variant==='string'&&typeof p.category==='string'&&amount(p.price)&&(p.limit===null||amount(p.limit)))
 &&Array.isArray(m.buyers)&&m.buyers.every(b=>record(b)&&typeof b.id==='string'&&typeof b.name==='string')
 &&record(m.orders)&&Object.values(m.orders).every(orders=>record(orders)&&Object.values(orders).every(o=>record(o)&&amount(o.quantity)&&Number.isInteger(o.quantity)&&typeof o.status==='string'&&typeof o.memo==='string'))
 &&Array.isArray(m.soldOut)&&m.soldOut.every(id=>typeof id==='string')
 &&amount(m.bonusThreshold)&&Array.isArray(m.bonusLabels)&&m.bonusLabels.every(label=>typeof label==='string')
 &&record(m.bonuses)&&Object.values(m.bonuses).every(items=>Array.isArray(items)&&items.every(amount));
}
export async function readRoom(id:string):Promise<SharedRoom>{
 const {data,error}=await cloud!.from('shopping_rooms').select('*').eq('id',id).single();
 if(error)throw error;
 if(!validMemo(data.memo))throw new Error('INVALID_DATA');
 return data as SharedRoom;
}
