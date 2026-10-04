import { Link, useParams } from "react-router";
import { loadEvents } from "../../services/storage";
import { OshiIcon } from "../../components/common/OshiIcon";

export default function EventCompletePage() {
  const { eventId } = useParams();
  const event = loadEvents().find(item => item.id === eventId);
  if (!event) return <main><h1>イベントが見つかりません</h1><Link className="task-navigation-button" to="/events">イベント一覧へ</Link></main>;
  const date = event.startDate ? event.startDate.replaceAll("-", "/") + (event.endDate && event.endDate !== event.startDate ? ` 〜 ${event.endDate.replaceAll("-", "/")}` : "") : "日程はあとで設定できます";
  return <main className="event-complete-page">
    <section className="event-complete-card">
      <OshiIcon name="complete" size={64} alt="" />
      <h1>イベントを登録しました！</h1>
      <div className="event-complete-summary"><h2>{event.title}</h2><>{event.performances?.length ? event.performances.map(show=><p key={show.id}>{show.date.replaceAll("-", "/")}　{show.venue || event.venue}</p>) : <p>{date}</p>}</>{event.attendanceDate && <p>参加日：{event.attendanceDate.replaceAll("-", "/")}</p>}</div>
      <p>詳細はあとからでも設定できます。</p>
      <nav className="event-complete-actions" aria-label="登録後の設定">
        <Link className="primary-link-button" to={`/events/${event.id}?edit=1`}><OshiIcon name="edit" size={24} alt="" />詳細を設定する</Link>
        <Link className="task-navigation-button" to={`/tickets/new?event=${event.id}`}><OshiIcon name="ticket" size={24} alt="" />チケットを追加</Link>
        <Link className="task-navigation-button" to={`/shopping/new?event=${event.id}`}><OshiIcon name="shopping-memo" size={24} alt="" />買い物メモを作る</Link>
      </nav>
    </section>
  </main>;
}
