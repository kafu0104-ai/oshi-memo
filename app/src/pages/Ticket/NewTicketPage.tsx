import { useState } from "react";
import { Link, useNavigate } from "react-router";
import ReceptionForm from "./ReceptionForm";
import { generateId } from "../../services/id";
import { loadEvents, loadTicketByEventId, saveEvents, saveTicketWithCompanions } from "../../services/storage";
import type { TicketReception } from "../../types/Ticket";
import type { Companion } from "../../types/Companion";

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [events] = useState(loadEvents);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const selected = events.find(event => event.id === eventId);
  function save(reception: TicketReception, companions: Companion[]) {
    setError("");
    const currentEvents = loadEvents();
    const existing = eventId ? currentEvents.find(event => event.id === eventId) : undefined;
    if (eventId && !existing) { setError("選んだイベントが見つかりません。選び直してください。"); return; }
    if (!existing && !title.trim()) { setError("公演・イベント名を入力してください。"); document.getElementById("new-ticket-title")?.focus(); return; }
    const id = existing?.id ?? generateId();
    if (existing) {
      const ticket = loadTicketByEventId(id);
      saveTicketWithCompanions({ id: ticket?.id ?? generateId(), eventId: id, receptions: [...(ticket?.receptions ?? []), reception] }, companions);
    } else {
      // Save the minimal event, ticket and companions together, with storage rollback on failure.
      saveEvents([...currentEvents, { id, title: title.trim(), startDate: "", endDate: "", venue: "" }], { eventId: id, receptions: [reception], companions });
    }
    navigate(`/events/${id}/tickets`, { replace: true });
  }
  return <main>
    <Link className="task-navigation-button" to="/tickets">チケット一覧に戻る</Link>
    <header className="page-header"><h1>チケットを登録</h1></header>
    <section className="event-detail-sheet">
      {events.length > 0 && <label className="form-field">関連するイベント<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">新しい公演・イベント</option>{events.map(event=><option key={event.id} value={event.id}>{event.title}</option>)}</select></label>}
      {!eventId && <label className="form-field" htmlFor="new-ticket-title">公演・イベント名（必須）<input id="new-ticket-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：ライブ名、展示会名"/></label>}
      {!eventId && <p>公演名だけでチケットを登録できます。日程・会場などは後からイベント情報に追加できます。</p>}
      {error && <p role="alert">{error}</p>}
      <ReceptionForm hideHeading performances={selected?.performances} fallbackName={selected?.title || title} onSave={save} onCancel={()=>navigate('/tickets')}/>
    </section>
  </main>;
}
