import { Link } from "react-router";
import type { Event } from "../../types/Event";

interface EventListProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
}

function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.replaceAll("-", "/");
}

function EventList({
  events,
  onEditEvent,
  onDeleteEvent,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <section aria-labelledby="event-list-heading">
        <h2 id="event-list-heading">イベント一覧</h2>
        <p>登録されているイベントはありません。</p>
      </section>
    );
  }

  const handleDelete = (event: Event) => {
    const shouldDelete = window.confirm(
      `「${event.title}」を削除しますか？`
    );

    if (shouldDelete) {
      onDeleteEvent(event.id);
    }
  };

  return (
    <section aria-labelledby="event-list-heading">
      <h2 id="event-list-heading">イベント一覧</h2>

      <div>
        {events.map((event) => {
          const startDate = formatDate(event.startDate);
          const endDate = formatDate(event.endDate);

          return (
            <article className="event-card" key={event.id}>
              <Link
                className="event-card-link"
                to={`/events/${event.id}`}
                aria-label={`${event.title}の詳細を開く`}
              />

              <div className="event-card-content">
                <div className="event-card-heading">
                  <h3>{event.title}</h3>

                  <span
                    className="event-card-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>

                {(startDate || endDate) && (
                  <p>
                    開催期間：
                    {startDate || "未設定"}
                    {endDate && endDate !== startDate
                      ? ` 〜 ${endDate}`
                      : ""}
                  </p>
                )}

                {event.venue && <p>会場：{event.venue}</p>}

                {event.officialUrl && (
                  <p className="event-card-action">
                    <a
                      href={event.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      公式サイトを開く
                    </a>
                  </p>
                )}

                {event.memo && <p>{event.memo}</p>}

                <div className="form-actions event-card-action">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onEditEvent(event)}
                  >
                    編集
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleDelete(event)}
                  >
                    削除
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default EventList;