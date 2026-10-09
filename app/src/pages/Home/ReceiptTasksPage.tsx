import { applySettlementCash, settlementItems, settlementKey, hasOffset } from "../../services/settlementOffsets";
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { loadTicketTasks, localToday, taskUrl, type TicketTask } from '../../services/ticketTasks';
import { transactTicketSettlements } from '../../services/storage';
export default function ReceiptTasksPage(){
 const {eventId}=useParams();
 const [,refresh]=useState(0);
 const [error,setError]=useState('');
 const [dates,setDates]=useState<Record<string,string>>({});
 const tasks=loadTicketTasks().filter(t=>t.eventId===eventId&&t.receive);
 const pending=tasks.filter(t=>!t.completed);
 const key=(t:TicketTask)=>`${t.ticketId}/${t.receptionId}/${t.applicationId}/${t.taskId}`;
 async function save(task:TicketTask,checked:boolean,date:string){
  try{
   await transactTicketSettlements((tickets,events)=>{
    const item=settlementItems(tickets,events).find(i=>settlementKey(i)===settlementKey({...task,settlementId:task.settlementId!}));
    if(!item)throw new Error('精算情報が見つかりません。');
    if(hasOffset(item.settlement))throw new Error('相殺後の残額は「支払い・相殺の記録と履歴」から記録してください。');
    if(checked)return {tickets:applySettlementCash(tickets,events,item,date),result:undefined};
    return {tickets:tickets.map(t=>t.id!==task.ticketId?t:{...t,receptions:t.receptions.map(r=>r.id!==task.receptionId?r:{...r,applications:r.applications.map(a=>a.id!==task.applicationId||!a.fulfillment?a:{...a,fulfillment:{...a.fulfillment,payment:{...a.fulfillment.payment,settlements:a.fulfillment.payment.settlements.map(s=>s.id!==task.settlementId?s:{...s,isSettled:false,settledDate:undefined})}}})})}),result:undefined};
   });
   setError('');refresh(n=>n+1);
  }catch(error){setError(error instanceof Error?error.message:'保存できませんでした。金額と受領日を確認してください。');}
 }
 return <main><header className="page-header"><h1>チケット代の受け取り</h1><p>{tasks[0]?.eventName}</p></header>
  {!tasks.length?<p>受け取りの記録はありません。</p>:<>
   <p role="status">{pending.length?`あと${new Set(pending.map(t=>t.companionId)).size}人 ／ 未受領 ${pending.some(t=>t.amount===undefined)?'金額未設定あり':pending.reduce((n,t)=>n+(t.amount||0),0).toLocaleString('ja-JP')+'円'}`:'全員分の精算が完了しました。完了済みに移動しています。'}</p>
   <p>通常の受け取りはチェックして記録できます。相殺や相殺後の残額は「支払い・相殺の記録と履歴」から記録してください。</p>
   {tasks.map(task=><section className="shopping-panel" key={key(task)}>
    <p>{task.receptionName}</p><label className="ticket-check"><input type="checkbox" checked={task.completed} disabled={task.offsetAmount !== undefined || (!task.completed&&task.amount===undefined)} onChange={e=>save(task,e.target.checked,dates[key(task)]??task.date??localToday())}/>{task.person}さん　{task.amount===undefined?'金額未設定':`${task.amount.toLocaleString('ja-JP')}円`}{task.completed?(task.dateLabel==='相殺完了日'?'（相殺完了）':'（精算済み）'):task.offsetAmount!==undefined?'（残額）':''}</label>
    {task.offsetAmount === undefined && <label className="form-field">受領日<input type="date" value={dates[key(task)]??task.date??localToday()} onChange={e=>{setDates(d=>({...d,[key(task)]:e.target.value}));if(task.completed&&e.target.value)save(task,true,e.target.value);}}/></label>}
    <Link className="task-navigation-button" to={taskUrl(task)}>支払い・相殺の記録と履歴</Link>
    <Link className="task-navigation-button" to={`/events/${task.eventId}/tickets/${task.receptionId}/edit#${task.applicationId}`}>チケット・精算の詳細</Link>
   </section>)}
  </>}{error&&<p role="alert">{error}</p>}<Link className="task-navigation-button" to="/tasks">やること一覧へ</Link>
 </main>;
}
