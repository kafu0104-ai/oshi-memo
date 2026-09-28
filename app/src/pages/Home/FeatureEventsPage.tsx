import { Link } from "react-router";
import { loadEvents, loadTicketByEventId } from "../../services/storage";
import { hasShoppingMemo } from "../../services/shopping";
export default function FeatureEventsPage({kind}:{kind:"shopping"|"tickets"}) {
  const events=loadEvents();
  const shopping=kind==="shopping";
  return <main><header className="page-header"><div><h1>{shopping?"買い物メモ":"チケット"}</h1><p>管理したいイベントを選んでください。</p></div></header>
    {shopping&&<p><Link to="/shared">友人と共有している買い物メモ →</Link></p>}
    <div className="management-links">{events.map(event=>{
      const exists=shopping?hasShoppingMemo(event.id):Boolean(loadTicketByEventId(event.id)?.receptions.length);
      return <Link className="management-card" key={event.id} to={shopping?`/events/${event.id}/shopping`:`/events/${event.id}${exists?"":"/tickets"}`}><strong>{event.title}</strong><span>{exists?"登録内容を確認":`${shopping?"買い物メモ":"チケット情報"}を追加`}</span><span aria-hidden="true">›</span></Link>;
    })}</div>
    {events.length===0&&<p>まずイベントを登録すると、{shopping?"買い物メモ":"チケット情報"}を追加できます。</p>}
    <p><Link to="/events">イベント一覧・新規登録へ →</Link></p>
  </main>;
}
