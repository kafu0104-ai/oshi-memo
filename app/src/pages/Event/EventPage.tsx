import { useEffect, useState } from "react";
import EventForm from "../../components/event/EventForm";
import EventList from "../../components/event/EventList";
import { loadEvents, saveEvents } from "../../services/storage";
import type { Event } from "../../types/Event";

function EventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const handleSaveEvent = (event: Event) => {
    const eventExists = events.some(
      (currentEvent) => currentEvent.id === event.id
    );

    const nextEvents = eventExists
      ? events.map((currentEvent) =>
          currentEvent.id === event.id ? event : currentEvent
        )
      : [...events, event];

    setEvents(nextEvents);
    saveEvents(nextEvents);

    setEditingEvent(null);
    setIsFormOpen(false);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    const nextEvents = events.filter(
      (event) => event.id !== eventId
    );

    setEvents(nextEvents);
    saveEvents(nextEvents);

    if (editingEvent?.id === eventId) {
      setEditingEvent(null);
      setIsFormOpen(false);
    }
  };

  const handleNewEvent = () => {
    if (isFormOpen && !editingEvent) {
      setIsFormOpen(false);
      return;
    }

    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingEvent(null);
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

        <button type="button" onClick={handleNewEvent}>
          {isFormOpen && !editingEvent
            ? "閉じる"
            : "＋ 新しいイベント"}
        </button>
      </section>

      {isFormOpen && (
        <EventForm
          onSaveEvent={handleSaveEvent}
          onCancel={handleCancel}
          editingEvent={editingEvent}
        />
      )}

      <EventList
        events={events}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </main>
  );
}

export default EventPage;