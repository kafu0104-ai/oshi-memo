import { Link } from "react-router";
import { loadEvents, loadTicketByEventId } from "../../services/storage";
export default function FeatureEventsPage({kind}:{kind:"shopping"|"tickets"}) {
  const shopping=kind==="shopping";
  const events=loadEvents().filter(event=>shopping || Boolean(loadTicketByEventId(event.id)?.receptions.length));
  return <main><header className="page-header"><h1>{shopping?"買い物メモ":"チケット"}</h1></header>
    <div className="shopping-list-actions"><Link className="primary-link-button" to={shopping?"/shopping/new":"/tickets/new"}>{shopping?"＋ 買い物メモを登録":"＋ チケットを登録"}</Link></div>
    <div className="management-links">{events.map(event=><Link className="management-card shopping-memo-list-card" key={event.id} to={shopping?`/events/${event.id}/shopping`:`/events/${event.id}/tickets`}><strong>{event.title}</strong><span aria-hidden="true">›</span></Link>)}</div>
    {events.length===0&&<p>{shopping?"買い物メモ":"チケット"}はまだ登録されていません。</p>}
  </main>;
}
