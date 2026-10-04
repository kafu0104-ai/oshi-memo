import { isPastEvent, eventLastDate } from "../../services/eventArchive";
import { useLocalToday } from "../../hooks/useLocalToday";
import type { EventTicketChanges } from "../../services/eventTicketDraft";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import QuickEventForm from "../../components/event/QuickEventForm";
import EventList from "../../components/event/EventList";

import {
  loadEvents,
  saveEvents,
} from "../../services/storage";

import type { Event } from "../../types/Event";


function EventPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useLocalToday();
  const past = searchParams.get("view") === "past";


  const [events, setEvents] = useState<Event[]>([]);
  const pastEvents = events.filter(event => isPastEvent(event, today)).sort((a,b)=>(eventLastDate(b)||"").localeCompare(eventLastDate(a)||""));
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("new") === "1");


  useEffect(() => {
    setEvents(loadEvents());
  }, []);


  const handleSaveEvent = (event: Event, tickets?: EventTicketChanges) => {
    const nextEvents = [...loadEvents(), event];

    saveEvents(nextEvents,tickets?{...tickets,eventId:event.id}:undefined);
    setEvents(nextEvents);

    setIsFormOpen(false);

    navigate(`/events/${event.id}/complete`, { replace: true });
  };


  const handleNewEvent = () => {
    setIsFormOpen((currentValue) => !currentValue);
  };


  const handleCancel = () => {
    setIsFormOpen(false);
  };


  return (
    <main>
      <section className="event-page-toolbar">
        <div>
          <h1>{isFormOpen ? "イベント登録" : past ? "過去のイベント" : "イベント一覧"}</h1>

          <p>
            ライブ、ショップ、コラボなどを
            まとめて管理します。
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewEvent}
        >
          {isFormOpen
            ? "閉じる"
            : "＋ 新しいイベント"}
        </button>
      </section>


      {isFormOpen && (
        <QuickEventForm
          onSaveEvent={handleSaveEvent}
          onCancel={handleCancel}
        />
      )}


      {!isFormOpen && <nav className="event-archive-switch" aria-label="イベントの表示"><button type="button" className={past ? "secondary-button" : ""} aria-pressed={!past} onClick={()=>setSearchParams({})}>現在・今後のイベント</button><button type="button" className={past ? "" : "secondary-button"} aria-pressed={past} onClick={()=>setSearchParams({view:"past"})}>過去のイベント（{pastEvents.length}）</button></nav>}
      {!isFormOpen && <EventList
        events={past ? pastEvents : events.filter(event=>!isPastEvent(event,today))}
        heading={past ? "過去のイベント" : "イベント一覧"}
        emptyMessage={past ? "過去のイベントはありません。" : "現在・今後のイベントはありません。"}
        onEditEvent={() => {}}
        onDeleteEvent={() => {}}
      />}
    </main>
  );
}

export default EventPage;