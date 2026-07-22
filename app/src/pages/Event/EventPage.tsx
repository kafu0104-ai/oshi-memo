import { useEffect, useState } from "react";
import EventForm from "../../components/event/EventForm";
import EventList from "../../components/event/EventList";
import { loadEvents, saveEvents } from "../../services/storage";
import type { Event } from "../../types/Event";

function EventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const handleAddEvent = (event: Event) => {
    const nextEvents = [...events, event];

    setEvents(nextEvents);
    saveEvents(nextEvents);
    setIsFormOpen(false);
  };

  return (
    <main>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">OSHI-MEMO</p>
          <h1>推しメモ</h1>
          <p>推し活で「あ、忘れてた…」をなくすアプリ。</p>
        </div>
      </header>

      <section className="event-page-toolbar">
        <div>
          <h2>イベント一覧</h2>
          <p>ライブ、ショップ、コラボなどをまとめて管理します。</p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((current) => !current)}
        >
          {isFormOpen ? "閉じる" : "＋ 新しいイベント"}
        </button>
      </section>

      {isFormOpen && (
        <EventForm
          onAddEvent={handleAddEvent}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <EventList events={events} />
    </main>
  );
}

export default EventPage;