import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import EventForm from "../../components/event/EventForm";
import EventList from "../../components/event/EventList";

import {
  loadEvents,
  saveEvents,
} from "../../services/storage";

import type { Event } from "../../types/Event";


function EventPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);


  useEffect(() => {
    setEvents(loadEvents());
  }, []);


  const handleSaveEvent = (event: Event) => {
    const nextEvents = [...events, event];

    setEvents(nextEvents);
    saveEvents(nextEvents);

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
      <header className="page-header">
        <div>
          <p className="page-eyebrow">
            OSHI-MEMO
          </p>

          <h1>推しメモ</h1>

          <p>
            推し活で「あ、忘れてた…」をなくすアプリ。
          </p>
        </div>
      </header>


      <section className="event-page-toolbar">
        <div>
          <h2>イベント一覧</h2>

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


      <EventList
        events={events}
        onEditEvent={() => {}}
        onDeleteEvent={() => {}}
      />
    </main>
  );
}

export default EventPage;