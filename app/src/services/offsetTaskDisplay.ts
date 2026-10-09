import { loadTickets, loadEvents, loadCompanions } from './storage';
import { offsetGroups, offsetGroupUrl } from './offsetGroups';
import { settlementKey } from './settlementOffsets';
import type { TicketTask } from './ticketTasks';
/** Presentation only: the original tasks and all their IDs stay intact. */
export function groupOffsetTasks(tasks:TicketTask[]):TicketTask[] {
  const groups=offsetGroups(loadTickets(),loadEvents()).filter(g=>!g.cancelled);
  const companions=loadCompanions();
  const covered=new Set(groups.flatMap(g=>g.histories.flatMap(h=>h.allocations.map(settlementKey))));
  const result=tasks.filter(t=>!t.settlementId||!covered.has(settlementKey({...t,settlementId:t.settlementId})));
  for(const g of groups) {
    const refs=new Set(g.histories.flatMap(h=>h.allocations.map(settlementKey)));
    const members=tasks.filter(t=>t.settlementId&&refs.has(settlementKey({...t,settlementId:t.settlementId})));
    const first=members[0];if(!first)continue;
    const allocations=[...new Map(g.histories.flatMap(h=>h.allocations).reverse().map(a=>[settlementKey(a),a])).values()];
    const receive=allocations.filter(a=>a.direction==='receive').reduce((n,a)=>n+a.before,0), pay=allocations.filter(a=>a.direction==='pay').reduce((n,a)=>n+a.before,0);
    const amount=Math.abs(receive-pay);
    const resultText=amount===0?'差額なし':`${amount.toLocaleString('ja-JP')}円${receive>pay?'受取':'支払'}${g.completed?(g.histories.some(h=>h.cashDate)?'済み':'・後続の相殺で完了'):'予定'}`;
    result.push({...first,settlementId:undefined,taskId:`offset:${g.id}`,offsetGroupId:g.id,offsetStatus:g.completed?'相殺済み':'相殺中',href:offsetGroupUrl(g.id),members,
      offsetSummary:`受取 ${receive.toLocaleString('ja-JP')}円 ／ 支払 ${pay.toLocaleString('ja-JP')}円 ／ ${resultText}`,
      eventName:g.eventNames.join(' ⇄ '),receptionName:'相殺した精算',person:companions.find(c=>c.id===g.companionId)?.name??'未登録の同行者',
      title:g.error?'相殺内容の確認が必要です':g.completed?'相殺した精算の履歴':`差額 ${g.remaining.toLocaleString('ja-JP')}円を${g.direction==='receive'?'受け取る':'支払う'}`,
      receive:false,amount:g.error?undefined:g.remaining,completed:g.completed,date:g.completedDate,dateLabel:'精算完了日',
      deadline:members.map(t=>t.deadline).filter((d):d is string=>!!d).sort()[0],important:members.some(t=>t.important),tagIds:[...new Set(members.flatMap(t=>t.tagIds))],offsetAmount:g.histories.reduce((n,h)=>n+h.offsetAmount,0)});
  }
  return result;
}
