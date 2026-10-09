import type { Ticket } from '../types/Ticket';
import type { Event } from '../types/Event';
import type { SettlementOffset } from '../types/SettlementOffset';
import { applySettlementCash, refreshOffsetHistory, replaceSettlement, settlementItems, settlementKey, yen, type SettlementItem } from './settlementOffsets';

export interface OffsetGroup {
  id: string; historyIds: string[]; histories: SettlementOffset[]; items: SettlementItem[];
  companionId: string; eventNames: string[]; eventIds: string[]; remaining: number;
  direction?: 'pay' | 'receive'; completed: boolean; cancelled: boolean; completedDate?: string;
  fingerprint: string; error?: string;
}
/** Histories already own stable IDs and precise settlement references. Overlapping
 * histories form one connected balance; old history URLs remain valid aliases. */
export function offsetGroups(tickets: Ticket[], events: Event[]): OffsetGroup[] {
  const histories = tickets.flatMap(t => t.offsetHistory ?? []);
  const items = settlementItems(tickets, events);
  const components: SettlementOffset[][] = [];
  for (const h of histories.filter(h => h.status !== 'cancelled').sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
    const keys = new Set(h.allocations.map(settlementKey));
    const matches = components.filter(c => c.some(p => p.allocations.some(a => keys.has(settlementKey(a)))));
    const joined = [...matches.flat(),h].sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    for (const match of matches) components.splice(components.indexOf(match),1);
    components.push(joined);
  }
  components.push(...histories.filter(h => h.status === 'cancelled').map(h => [h]));
  return components.map(hs => {
    const refs = [...new Set(hs.flatMap(h => h.allocations.map(settlementKey)))];
    const members = items.filter(i => refs.includes(settlementKey(i)));
    const cancelled = hs.every(h => h.status === 'cancelled');
    const pending = members.filter(i => (i.remaining ?? 0) > 0);
    const directions = new Set(pending.map(i => i.direction));
    const error = refs.length !== members.length || members.some(i=>i.remaining===undefined) || new Set(hs.map(h=>h.companionId)).size !== 1 || members.some(i=>i.companionId!==hs[0].companionId) || directions.size > 1 ? '関連する精算に不整合があります。記録を確認してください。' : undefined;
    const remaining = cancelled ? 0 : pending.reduce((n,i)=>yen(n+yen(i.remaining)),0);
    return {id:hs[0].id,historyIds:hs.map(h=>h.id),histories:hs,items:members,companionId:hs[0].companionId,
      eventNames:[...new Set(hs.flatMap(h=>h.allocations.map(a=>a.eventName)))],eventIds:[...new Set(hs.flatMap(h=>h.allocations.map(a=>a.eventId)))],
      remaining,direction:pending[0]?.direction,completed:!cancelled&&!error&&remaining===0,cancelled,error,
      completedDate:remaining===0 ? [...hs.map(h=>h.completedDate??h.cashDate??h.offsetDate),...members.map(i=>i.settlement.settledDate??i.settlement.offsetCompletedDate??'')].sort().at(-1) : undefined,
      fingerprint:JSON.stringify([hs,members.map(i=>i.fingerprint)])};
  });
}
export function findOffsetGroup(tickets:Ticket[],events:Event[],id:string) {
  return offsetGroups(tickets,events).find(g=>g.historyIds.includes(id));
}
function freshGroup(tickets:Ticket[],events:Event[],expected:OffsetGroup) {
  const group=findOffsetGroup(tickets,events,expected.id);
  if(!group||group.fingerprint!==expected.fingerprint)throw new Error('精算状態が変更されています。最新の内容を読み直してください。');
  if(group.error)throw new Error(group.error);
  if(group.cancelled||group.completed)throw new Error('この相殺は既に完了または取り消されています。');
  return group;
}
export function completeOffsetGroup(tickets:Ticket[],events:Event[],expected:OffsetGroup,date:string) {
  const group=freshGroup(tickets,events,expected);
  let next=tickets;
  for(const original of group.items.filter(i=>(i.remaining??0)>0)) {
    const item=settlementItems(next,events).find(i=>settlementKey(i)===settlementKey(original))!;
    next=applySettlementCash(next,events,item,date);
  }
  return refreshOffsetHistory(next,events);
}
export function cancelOffsetGroup(tickets:Ticket[],events:Event[],expected:OffsetGroup,at:string) {
  const group=freshGroup(tickets,events,expected);
  if(group.histories.some(h=>h.cashDate||h.allocations.some(a=>a.cash>0)))throw new Error('金銭授受がある相殺は取り消せません。');
  let next=tickets;
  // Reverse the exact ledger order. Snapshots allow lossless undo of new histories;
  // legacy histories release only their recorded offsets, retaining known totals.
  for(const h of [...group.histories].reverse()) {
    for(const a of h.allocations) {
      const item=settlementItems(next,events).find(i=>settlementKey(i)===settlementKey(a));
      if(!item)throw new Error('対象の精算が見つかりません。');
      const s=item.settlement;
      if(a.afterSettlement && JSON.stringify(s)!==JSON.stringify(a.afterSettlement))throw new Error('相殺後に精算内容が変更されています。取り消せません。');
      if(!a.afterSettlement && ((s.cashAmount??0)>0 || (s.offsetAmount??0)<a.offset || (s.isSettled&&item.remaining!==0)))throw new Error('相殺後の金銭授受・変更があるため取り消せません。');
      const restored=a.beforeSettlement ?? {...s,offsetAmount:yen((s.offsetAmount??0)-a.offset),isSettled:false,offsetCompletedDate:undefined};
      next=replaceSettlement(next,a,structuredClone(restored));
      if(settlementItems(next,events).find(i=>settlementKey(i)===settlementKey(a))?.total!==item.total)throw new Error('相殺後にチケット料金が変更されています。取り消せません。');
    }
    next=next.map(t=>!t.offsetHistory?t:{...t,offsetHistory:t.offsetHistory.map(p=>p.id===h.id?{...p,status:'cancelled',cancelledAt:at}:p)});
  }
  return refreshOffsetHistory(next,events);
}
export const offsetGroupUrl=(id:string)=>`/tasks/offsets/${encodeURIComponent(id)}`;
