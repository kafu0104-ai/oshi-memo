import type { Event } from "../../types/Event";

interface EventListProps {
  events: Event[];
}

function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.replaceAll("-", "/");
}

function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <section aria-labelledby="event-list-heading">
        <h2 id="event-list-heading">イベント一覧</h2>
        <p>登録されているイベントはありません。</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="event-list-heading">
      <h2 id="event-list-heading">イベント一覧</h2>

      <div>
        {events.map((event) => {
          const startDate = formatDate(event.startDate);
          const endDate = formatDate(event.endDate);

          return (
            <article key={event.id}>
              <h3>{event.title}</h3>

              {(startDate || endDate) && (
                <p>
                  開催期間：
                  {startDate || "未設定"}
                  {endDate && endDate !== startDate ? ` 〜 ${endDate}` : ""}
                </p>
              )}

              {event.venue && <p>会場：{event.venue}</p>}

              {event.officialUrl && (
                <p>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default EventList;