import { Link } from "react-router";
import type { Event } from "../../types/Event";

interface EventListProps {
  events: Event[];
  heading?: string;
  emptyMessage?: string;
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
  heading = "イベント一覧",
  emptyMessage = "登録されているイベントはありません。",
}: EventListProps) {
  if (events.length === 0) {
    return (
      <section aria-labelledby="event-list-heading">
        <h2 id="event-list-heading">{heading}</h2>
        <p>{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="event-list-heading">
      <h2 id="event-list-heading">{heading}</h2>

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
              >
                <div className="event-card-main">
                  <h3>{event.title}</h3>

                  {(startDate || endDate) && (
                    <p>
                      開催期間：
                      {startDate || "未設定"}
                      {endDate && endDate !== startDate
                        ? ` 〜 ${endDate}`
                        : ""}
                    </p>
                  )}

                  {event.venue && (
                    <p className="event-card-venue">
                      会場：{event.venue}
                    </p>
                  )}
                </div>

                <span
                  className="event-card-chevron"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default EventList;