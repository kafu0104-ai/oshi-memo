import { loadExchangeTasks } from "../../services/exchangeTasks";
import { TaskTags } from "../../components/common/TaskTags";
import { Link } from "react-router";
import { groupReceiptTasks, loadTicketTasks, taskUrl, sortTasks, localToday } from "../../services/ticketTasks";
export default function TicketTodos({ all = false }: { all?: boolean }) {
  const tasks = sortTasks([...groupReceiptTasks(loadTicketTasks()), ...loadExchangeTasks()].filter(task => !task.completed));
  return <div className="ticket-task-list">
    <p className="task-count">未完了 {tasks.length}件</p>
    {tasks.length === 0 ? <div className="empty-card"><p>現在、対応が必要な項目はありません。</p></div> : (all ? tasks : tasks.slice(0,3)).map(task => <Link className="ticket-task-link" key={taskUrl(task)} to={taskUrl(task)}>
      <div className="task-card-main"><strong><TaskTags ids={task.tagIds} />{task.title}</strong><span className="task-event-name">{task.eventName}</span><div className="task-card-meta">{!task.schedule && <b>{task.amount === undefined ? "金額未設定" : `${task.amount.toLocaleString("ja-JP")}円`}</b>}{task.deadline && <span className={task.deadline < localToday() ? "task-overdue" : ""}>{task.deadline < localToday() ? "期限切れ · " : "期限 "}{task.deadline.replaceAll("-","/")}</span>}</div></div><span className="task-chevron" aria-hidden="true">›</span>
    </Link>)}
    {!all && tasks.length >= 2 && <div className="task-list-footer"><Link className="task-navigation-button" to="/tasks">タスクをもっと見る →</Link></div>}
  </div>;
}
export function AllTasksPage() { return <main><h1>やることリスト</h1><TicketTodos all /></main>; }
