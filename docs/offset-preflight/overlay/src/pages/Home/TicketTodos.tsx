import { groupOffsetTasks } from '../../services/offsetTaskDisplay';
import { useEffect, useState } from "react";
import { loadExchangeTasks } from "../../services/exchangeTasks";
import { TaskTags } from "../../components/common/TaskTags";
import { Link } from "react-router";
import { groupReceiptTasks, loadTicketTasks, taskUrl, sortTasks, localToday } from "../../services/ticketTasks";
export default function TicketTodos({ all = false }: { all?: boolean }) {
  const [, refresh] = useState(0);
  useEffect(()=>{const update=()=>refresh(n=>n+1);const timer=setInterval(update,30000);window.addEventListener("focus",update);return ()=>{clearInterval(timer);window.removeEventListener("focus",update);};},[]);
  const tasks = sortTasks([...groupReceiptTasks(groupOffsetTasks(loadTicketTasks())), ...loadExchangeTasks()].filter(task => !task.completed));
  return <div className="ticket-task-list">
    {all && <p className="task-count">未完了 {tasks.length}件</p>}
    {tasks.length === 0 ? <div className="empty-card"><p>現在、対応が必要な項目はありません。</p></div> : (all ? tasks : tasks.slice(0,3)).map(task => <Link className="ticket-task-link" key={taskUrl(task)} to={taskUrl(task)}>
      <div className="task-card-main"><strong>{task.offsetStatus && <span className="task-tag">{task.offsetStatus}</span>}<TaskTags ids={task.tagIds} />{task.title}</strong>{(all || task.offsetAmount !== undefined) && <><span className="task-event-name">{task.eventName}</span>{task.offsetGroupId&&<span>精算相手：{task.person}さん</span>}<div className="task-card-meta">{!task.schedule && <b>{task.amount === undefined ? "金額未設定" : `${task.offsetAmount !== undefined ? "残額 " : ""}${task.amount.toLocaleString("ja-JP")}円`}</b>}{task.deadline && <span className={task.deadline < localToday() ? "task-overdue" : ""}>{task.deadline < localToday() ? "期限切れ · " : "期限 "}{task.deadline.replaceAll("-","/")}</span>}</div></>}</div><span className="task-chevron" aria-hidden="true">›</span>
    </Link>)}
    {!all && tasks.length > 3 && <div className="task-list-footer"><Link className="task-navigation-button" to="/tasks">すべてのやることを見る</Link></div>}
  </div>;
}
export function AllTasksPage() { return <main><h1>やることリスト</h1><TicketTodos all /></main>; }
