import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { loadTickets, loadEvents, loadCompanions, transactTicketSettlements } from '../../services/storage';
import { cancelOffsetGroup, completeOffsetGroup, findOffsetGroup } from '../../services/offsetGroups';
import { settlementKey } from '../../services/settlementOffsets';
const money=(n:number)=>`${n.toLocaleString('ja-JP')}円`;
export default function OffsetGroupPage() {
 const {groupId}=useParams();return <GroupDetails key={groupId} id={groupId??''}/>;
}
export function GroupDetails({id}:{id:string}) {
 const read=()=>findOffsetGroup(loadTickets(),loadEvents(),id);
 const [group,setGroup]=useState(read),[date,setDate]=useState(''),[review,setReview]=useState<'cash'|'cancel'|undefined>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 if(!group)return <main><h1>相殺履歴が見つかりません</h1><Link to="/">ホームへ戻る</Link></main>;
 const person=loadCompanions().find(c=>c.id===group.companionId)?.name??'未登録の同行者';
 const allocations=[...new Map(group.histories.flatMap(h=>h.allocations).reverse().map(a=>[settlementKey(a),a])).values()];
 const receive=allocations.filter(a=>a.direction==='receive').reduce((n,a)=>n+a.before,0),pay=allocations.filter(a=>a.direction==='pay').reduce((n,a)=>n+a.before,0);
 async function save() {
   if(!review||busy)return;setBusy(true);setError('');
   try {await transactTicketSettlements((tickets,events)=>({tickets:review==='cash'?completeOffsetGroup(tickets,events,group!,date):cancelOffsetGroup(tickets,events,group!,new Date().toISOString()),result:undefined}),true);
    setGroup(read());setMessage(review==='cash'?'差額の精算を記録しました。関連するタスクは完了済みアーカイブに移動しました。':'相殺を取り消しました。元の未精算タスクを復元しました。');setReview(undefined);
   }catch(e){setError(e instanceof Error?e.message:'保存できませんでした。');setReview(undefined);}finally{setBusy(false);}
 }
 return <main className="event-detail-page"><Link to={group.completed?'/tasks/completed':'/'}>{group.completed?'完了済みタスクへ':'ホームへ'}</Link><article className="event-detail-sheet">
  <span className="task-tag">{group.cancelled?'相殺取消':group.completed?'相殺済み':'相殺中'}</span><h1>{group.eventNames.join(' ⇄ ')}</h1><p>精算相手：{person}さん</p>
  <dl className="task-facts"><dt>受取</dt><dd>{money(receive)}</dd><dt>支払</dt><dd>{money(pay)}</dd><dt>相殺に充当</dt><dd>{money(group.histories.reduce((n,h)=>n+h.offsetAmount,0))}</dd><dt>相殺後の差額</dt><dd>{money(Math.abs(receive-pay))}（{receive===pay?'金銭授受なし':receive>pay?`${person}さん → 自分`:`自分 → ${person}さん`}）</dd><dt>現在の未精算残額</dt><dd>{group.cancelled?'取り消し済み・元の精算で管理':money(group.remaining)}</dd><dt>設定日</dt><dd>{group.histories[0].offsetDate}</dd>{group.completed&&<><dt>完了日</dt><dd>{group.completedDate}</dd><dt>精算結果</dt><dd>{group.histories.some(h=>h.cashDate)?`${money(Math.abs(receive-pay))}${receive>pay?'受取':'支払'}済み`:'金銭授受なしで相殺完了'}</dd></>}</dl>
  {group.error&&<p role="alert">{group.error}</p>}{message&&<p role="status">{message}</p>}
  <h2>関連する精算</h2>{allocations.map(a=><section className="ticket-options" key={settlementKey(a)}><Link to={`/events/${a.eventId}`}>{a.eventName}</Link><p>{a.label} ／ {person}さん ／ {a.direction==='pay'?'支払':'受取'} {money(a.before)}</p><Link to={`/tasks/${a.ticketId}/${a.receptionId}/${a.applicationId}/${a.settlementId}`}>元の精算を確認</Link></section>)}
  {!group.completed&&!group.cancelled&&!group.error&&<section><h2>差額の精算</h2><p>{group.direction==='pay'?`自分 → ${person}さん`:`${person}さん → 自分`}：{money(group.remaining)}</p>
   <label className="form-field">{group.direction==='pay'?'差額の支払日':'差額の受取日'}<input type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setReview(undefined);}}/></label>
   <button type="button" disabled={busy||!date} onClick={()=>setReview('cash')}>{group.direction==='pay'?'支払い':'受け取り'}を記録</button>
   <button type="button" className="secondary-button" disabled={busy} onClick={()=>setReview('cancel')}>相殺を取り消す</button>
   {review&&<section className="settlement-confirm" aria-label="確定前の内容確認"><h3>内容を確認してください</h3><p>{review==='cash'?`${date}に差額 ${money(group.remaining)} の${group.direction==='pay'?'支払い':'受け取り'}を記録し、関連する精算を完了します。`:'このグループの相殺を取り消し、充当金額を解放します。履歴は残ります。金銭授受や変更があった場合は取り消せません。'}</p><button type="button" disabled={busy} onClick={()=>void save()}>この内容で確定</button><button type="button" disabled={busy} onClick={()=>setReview(undefined)}>戻る</button></section>}
  </section>}
  {error&&<div role="alert"><p>{error}</p><button type="button" onClick={()=>{setGroup(read());setError('');setReview(undefined);}}>最新の内容を読み直す</button></div>}
  <h2>相殺履歴</h2>{group.histories.map(h=><details key={h.id}><summary>{h.offsetDate} ／ 相殺 {money(h.offsetAmount)}{h.status==='cancelled'?'（取消）':''}</summary><p>相殺ID：{h.id}</p><p>差額 {money(h.remainingAmount)} ／ {h.remainingDirection==='pay'?'自分から支払う':h.remainingDirection==='receive'?'自分が受け取る':'差額なし'}</p><p>{h.cashDate?`差額精算日：${h.cashDate}`:'金銭授受の記録なし'}{h.cancelledAt&&` ／ 取消日時：${h.cancelledAt}`}</p>{h.allocations.map(a=><p key={settlementKey(a)}>{a.eventName} ／ {a.label}：相殺前 {money(a.before)} ／ 充当 {money(a.offset)} ／ 相殺確定時の金銭授受 {money(a.cash)}<br/>精算ID：{a.settlementId}</p>)}</details>)}
  <small>相殺グループID：{group.id}</small>
 </article></main>;
}
