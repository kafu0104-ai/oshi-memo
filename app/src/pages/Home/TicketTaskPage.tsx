import { loadExchangeTasks } from "../../services/exchangeTasks";
import { TaskTags } from "../../components/common/TaskTags";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { groupReceiptTasks, loadTicketTasks, taskUrl } from "../../services/ticketTasks";
import { loadTickets, saveTicket } from "../../services/storage";

export function CompletedTasksPage() {
  const tasks = [...groupReceiptTasks(loadTicketTasks()), ...loadExchangeTasks()].filter(task => task.completed);
  return <main><Link className="task-navigation-button" to="/settings">← 設定・管理へ戻る</Link><h1>完了済みタスク</h1><div className="ticket-task-list">
    {tasks.length === 0 && <p>完了済みのタスクはありません。</p>}
    {tasks.map(task => <Link className="ticket-task-link" key={taskUrl(task)} to={taskUrl(task)}><strong><TaskTags ids={task.tagIds} />{task.title}</strong><span>{task.eventName}</span>{!task.href?.startsWith("/exchange") && <span>{task.dateLabel}：{task.date ?? "未登録"}</span>}</Link>)}
  </div></main>;
}
export default function TicketTaskPage() {
  const params = useParams();
  // Remount the draft when navigating between tasks.
  return <TaskDetails key={Object.values(params).join("/")} />;
}
function TaskDetails() {
  const { ticketId, receptionId, applicationId, taskId } = useParams();
  const navigate = useNavigate();
  const task = loadTicketTasks().find(t => t.ticketId === ticketId && t.receptionId === receptionId && t.applicationId === applicationId && t.taskId === taskId);
  const [date, setDate] = useState(task?.date ?? "");
  const [error, setError] = useState("");
  if (!task) return <main><h1>タスクが見つかりません</h1><Link className="task-navigation-button" to="/">ホームへ戻る</Link></main>;
  return <main className="event-detail-page">{task.completed && <Link className="task-navigation-button" to="/tasks/completed">← 完了済みタスクへ戻る</Link>}
    <article className="event-detail-sheet"><p className={`task-status-badge ${task.completed ? "is-completed" : "is-pending"}`}>{task.completed ? "完了済み" : "未完了"}</p><h1>{task.title}</h1>
      <dl className="task-facts"><dt>イベント名</dt><dd>{task.eventName}</dd>{task.receptionName.trim() !== task.eventName.trim() && <><dt>チケット情報</dt><dd>{task.receptionName}</dd></>}<dt>{task.settlementId ? (task.dateLabel === "支払日" ? "支払先" : "受領する相手") : "支払者"}</dt><dd>{task.person}</dd><dt>チケット代（手数料込み）</dt><dd>{task.amount === undefined ? "金額未設定" : `${task.amount.toLocaleString("ja-JP")}円`}</dd></dl>
      <div className="task-detail-tags">
        <TaskTags ids={task.tagIds} />
      </div>
      <form className="task-completion-form" onSubmit={e => {
        e.preventDefault();
        const completedDate = String(new FormData(e.currentTarget).get("completedDate") ?? "");
        try {
          const fresh = loadTicketTasks().find(t => taskUrl(t) === taskUrl(task));
          if (!fresh || fresh.amount === undefined || !completedDate) throw new Error();
          const ticket = loadTickets().find(t => t.id === ticketId); if (!ticket) throw new Error();
          saveTicket({ ...ticket, receptions: ticket.receptions.map(r => r.id !== receptionId ? r : { ...r, applications: r.applications.map(a => a.id !== applicationId || !a.fulfillment ? a : { ...a, fulfillment: { ...a.fulfillment, payment: { ...a.fulfillment.payment, ...(task.settlementId ? { settlements: a.fulfillment.payment.settlements.map(s => s.id === task.settlementId ? { ...s, amount: fresh.amount!, isSettled: true, settledDate: completedDate } : s) } : { isPaid: true, paidDate: completedDate }) } } }) }) });
          navigate("/tasks/completed");
        } catch { setError("保存できませんでした。金額や保存設定を確認して、もう一度お試しください。"); }
      }}>
        <label className="form-field">{task.dateLabel}<input name="completedDate" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        <p>{task.completed ? "日付を変更して保存できます。" : "実際に完了した日を入力して保存すると、完了済みタスクに移動します。"}</p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={task.amount === undefined}>{task.completed ? "日付を保存" : "保存して完了"}</button>
      </form>
      <Link className="task-navigation-button" to={`/events/${task.eventId}#ticket-${task.receptionId}`}>イベントのチケット情報を確認</Link>
    </article>
  </main>;
}
