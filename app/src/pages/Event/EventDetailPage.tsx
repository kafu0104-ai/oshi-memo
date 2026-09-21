import { Link, useParams } from "react-router";
import { loadEvents } from "../../services/storage";

function EventDetailPage() {
  const { eventId } = useParams();

  const event = loadEvents().find(
    (currentEvent) => currentEvent.id === eventId
  );

  if (!event) {
    return (
      <main>
        <header className="page-header">
          <p className="page-eyebrow">OSHI-MEMO</p>
          <h1>イベントが見つかりません</h1>
        </header>

        <Link to="/events">← イベント一覧へ戻る</Link>
      </main>
    );
  }

  return (
    <main>
      <header className="page-header">
        <p className="page-eyebrow">EVENT</p>
        <h1>{event.title}</h1>

        {(event.startDate || event.endDate) && (
          <p>
            {event.startDate || "未設定"}
            {event.endDate && event.endDate !== event.startDate
              ? ` 〜 ${event.endDate}`
              : ""}
          </p>
        )}

        {event.venue && <p>{event.venue}</p>}
      </header>

      <section>
        <h2>イベントメニュー</h2>

        <div>
          <button type="button">🛍 買い物メモ</button>
          <button type="button">🤝 代行管理</button>
          <button type="button">📋 イベント情報</button>
        </div>
      </section>

      <p>
        <Link to="/events">← イベント一覧へ戻る</Link>
      </p>
    </main>
  );
}

export default EventDetailPage;