import DeleteReception from "./DeleteReception";
import { Link, useNavigate, useParams } from "react-router";
import { loadEvents, loadTicketByEventId, saveTicketWithCompanions } from "../../services/storage";
import type { TicketReception } from "../../types/Ticket";
import type { Companion } from "../../types/Companion";
import ReceptionForm from "./ReceptionForm";

export default function TicketEditPage() {
  const { eventId, receptionId } = useParams();
  const navigate = useNavigate();
  const event = loadEvents().find(item => item.id === eventId);
  const reception = eventId ? loadTicketByEventId(eventId)?.receptions.find(item => item.id === receptionId) : undefined;
  const returnTo = event ? `/events/${event.id}` : "/events";

  async function save(updated: TicketReception, newCompanions: Companion[]) {
    if (!eventId) return;
    const ticket = loadTicketByEventId(eventId);
    const current = ticket?.receptions.find(item => item.id === receptionId);
    if (!ticket || !current) throw new Error("チケット情報が見つかりません。");
    await saveTicketWithCompanions({ ...ticket, receptions: ticket.receptions.map(item => item.id === receptionId
      ? { ...current, ...updated, id: current.id }
      : item) }, newCompanions);
    navigate(returnTo);
  }

  return <main className="event-detail-page">
    <div className="event-detail-back"><Link className="text-link" to={returnTo}>← {event ? "イベント詳細へ戻る" : "イベント一覧へ戻る"}</Link></div>
    <article className="event-detail-sheet">
      {event && reception ? <>
        <p>{event.title}</p>
        <ReceptionForm performances={event.performances} key={`${eventId}-${receptionId}`} reception={reception} onSave={save} onCancel={() => navigate(returnTo)} />
        <DeleteReception eventId={event.id} receptionId={reception.id} name={reception.name} onDeleted={() => navigate(returnTo)} />
      </> : <><h1>チケット情報が見つかりません</h1><p>削除されたか、URLが正しくない可能性があります。</p></>}
    </article>
  </main>;
}
