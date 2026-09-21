import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import EventForm from "../../components/event/EventForm";
import {
  loadEvents,
  saveEvents,
} from "../../services/storage";

import type { Event } from "../../types/Event";
import { DEFAULT_EVENT_TAGS } from "../../types/EventTag";


function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.replaceAll("-", "/");
}


function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>(
    () => loadEvents()
  );

  const [isEditing, setIsEditing] = useState(false);

  const event = events.find(
    (currentEvent) => currentEvent.id === eventId
  );


  if (!event) {
    return (
      <main>
        <header className="page-header">
          <p className="page-eyebrow">
            EVENT
          </p>

          <h1>イベントが見つかりません</h1>

          <p>
            削除されたか、URLが正しくない可能性があります。
          </p>
        </header>

        <Link
          className="text-link"
          to="/events"
        >
          ← イベント一覧へ戻る
        </Link>
      </main>
    );
  }


  const selectedTags = DEFAULT_EVENT_TAGS.filter(
    (tag) => event.tagIds?.includes(tag.id)
  );

  const scheduleItems =
    event.schedule?.filter(
      (item) => item.time.trim() !== ""
    ) ?? [];

  const startDate = formatDate(event.startDate);
  const endDate = formatDate(event.endDate);


  const handleSaveEvent = (
    updatedEvent: Event
  ) => {
    const nextEvents = events.map(
      (currentEvent) =>
        currentEvent.id === updatedEvent.id
          ? updatedEvent
          : currentEvent
    );

    setEvents(nextEvents);
    saveEvents(nextEvents);
    setIsEditing(false);
  };


  const handleDeleteEvent = () => {
    const shouldDelete = window.confirm(
      `「${event.title}」を削除しますか？\nこの操作は取り消せません。`
    );

    if (!shouldDelete) {
      return;
    }

    const nextEvents = events.filter(
      (currentEvent) =>
        currentEvent.id !== event.id
    );

    saveEvents(nextEvents);

    navigate("/events");
  };


  return (
    <main>
      <div className="event-detail-back">
        <Link
          className="text-link"
          to="/events"
        >
          ← イベント一覧
        </Link>
      </div>


      {!isEditing && (
        <>
          <header className="event-detail-header">
            <p className="page-eyebrow">
              EVENT
            </p>

            <h1>{event.title}</h1>


            {selectedTags.length > 0 && (
              <div className="event-detail-tags">
                {selectedTags.map((tag) => (
                  <span
                    className="event-detail-tag"
                    key={tag.id}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </header>


          <section
            className="event-detail-card"
            aria-labelledby="event-info-heading"
          >
            <div className="event-detail-section-heading">
              <div>
                <p className="section-label">
                  INFORMATION
                </p>

                <h2 id="event-info-heading">
                  イベント情報
                </h2>
              </div>

              <button
                className="event-detail-edit-button"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                編集
              </button>
            </div>


            <dl className="event-detail-info">
              {(startDate || endDate) && (
                <div>
                  <dt>開催日程</dt>

                  <dd>
                    {startDate || "未定"}

                    {endDate &&
                      endDate !== startDate &&
                      ` 〜 ${endDate}`}
                  </dd>
                </div>
              )}


              {scheduleItems.length > 0 && (
                <div>
                  <dt>時間</dt>

                  <dd>
                    <div className="event-detail-schedule">
                      {scheduleItems.map((item) => (
                        <div
                          className="event-detail-schedule-row"
                          key={item.id}
                        >
                          <span>
                            {item.label}
                          </span>

                          <strong>
                            {item.time}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>
              )}


              {event.venue && (
                <div>
                  <dt>会場</dt>

                  <dd>{event.venue}</dd>
                </div>
              )}


              {event.officialUrl && (
                <div>
                  <dt>公式サイト</dt>

                  <dd>
                    <a
                      href={event.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      公式サイトを開く ↗
                    </a>
                  </dd>
                </div>
              )}


              {event.memo && (
                <div>
                  <dt>メモ</dt>

                  <dd className="event-detail-memo">
                    {event.memo}
                  </dd>
                </div>
              )}


              {!startDate &&
                !endDate &&
                scheduleItems.length === 0 &&
                !event.venue &&
                !event.officialUrl &&
                !event.memo && (
                  <div>
                    <dt>イベント情報</dt>

                    <dd>
                      まだ詳細情報は登録されていません。
                    </dd>
                  </div>
                )}
            </dl>
          </section>


          <section
            className="event-detail-menu-section"
            aria-labelledby="event-menu-heading"
          >
            <div className="section-heading">
              <p className="section-label">
                EVENT MENU
              </p>

              <h2 id="event-menu-heading">
                このイベントで管理する
              </h2>
            </div>


            <div className="event-detail-menu-grid">
              <button type="button">
                <span aria-hidden="true">
                  🛍
                </span>

                <span>
                  買い物メモ
                </span>
              </button>


              <button type="button">
                <span aria-hidden="true">
                  🤝
                </span>

                <span>
                  代行管理
                </span>
              </button>


              <button type="button">
                <span aria-hidden="true">
                  🎫
                </span>

                <span>
                  チケット・座席
                </span>
              </button>


              <button type="button">
                <span aria-hidden="true">
                  ✅
                </span>

                <span>
                  やること
                </span>
              </button>
            </div>
          </section>


          <section className="event-detail-danger-zone">
            <button
              className="event-delete-button"
              type="button"
              onClick={handleDeleteEvent}
            >
              このイベントを削除
            </button>
          </section>
        </>
      )}


      {isEditing && (
        <EventForm
          editingEvent={event}
          onSaveEvent={handleSaveEvent}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </main>
  );
}

export default EventDetailPage;