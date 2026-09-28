import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import EventForm from "../../components/event/EventForm";
import EventList from "../../components/event/EventList";

import {
  loadEvents,
  saveEvents,
} from "../../services/storage";

import type { Event } from "../../types/Event";


function EventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("new") === "1");


  useEffect(() => {
    setEvents(loadEvents());
  }, []);


  const handleSaveEvent = (event: Event) => {
    const nextEvents = [...loadEvents(), event];

    saveEvents(nextEvents);
    setEvents(nextEvents);

    setIsFormOpen(false);

    /*
      登録完了後は一覧に残らず、
      今登録したイベントの詳細ページへ移動する。
    */
    navigate(`/events/${event.id}`, {
      state: {
        justCreated: true,
      },
    });
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
          <h1>{isFormOpen ? "イベント登録" : "イベント一覧"}</h1>

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
        <EventForm
          onSaveEvent={handleSaveEvent}
          onCancel={handleCancel}
        />
      )}


      {!isFormOpen && <EventList
        events={events}
        onEditEvent={() => {}}
        onDeleteEvent={() => {}}
      />}
    </main>
  );
}

export default EventPage;