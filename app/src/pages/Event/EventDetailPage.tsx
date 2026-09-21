import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
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


interface EventDetailLocationState {
  justCreated?: boolean;
}


function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.replaceAll("-", "/");
}


function EventDetailPage() {
  const { eventId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const locationState =
    location.state as EventDetailLocationState | null;

  const [events, setEvents] = useState<Event[]>(
    () => loadEvents()
  );

  const [isEditing, setIsEditing] = useState(false);

  const [showCreatedMessage, setShowCreatedMessage] =
    useState(Boolean(locationState?.justCreated));


  /*
    一覧や登録フォームで下までスクロールしていても、
    詳細ページを開いたら必ずページ上部から表示する。
  */
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [eventId]);


  /*
    新規登録直後だけ完了メッセージを表示する。

    history の state はそのままだと残るため、
    表示後に現在のURLへ置き換えて state を消しておく。
  */
  useEffect(() => {
    if (!locationState?.justCreated) {
      return;
    }

    setShowCreatedMessage(true);

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }, [
    location.pathname,
    locationState?.justCreated,
    navigate,
  ]);


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

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
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
    <main className="event-detail-page">
      <div className="event-detail-back">
        <Link
          className="text-link"
          to="/events"
        >
          ← イベント一覧
        </Link>
      </div>


      {showCreatedMessage && !isEditing && (
        <div
          className="event-created-message"
          role="status"
        >
          <span aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>
              イベントを登録しました
            </strong>

            <p>
              必要な情報をメモとして追加していきましょう。
            </p>
          </div>
        </div>
      )}


      {!isEditing && (
        <>
          <header className="event-detail-header">
            <p className="page-eyebrow">
              EVENT
            </p>

            <h1>
              {event.title}
            </h1>


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
                  EVENT INFORMATION
                </p>

                <h2 id="event-info-heading">
                  イベント情報
                </h2>
              </div>

              <button
                className="event-detail-edit-button"
                type="button"
                onClick={() => {
                  setShowCreatedMessage(false);
                  setIsEditing(true);

                  window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "smooth",
                  });
                }}
              >
                編集
              </button>
            </div>


            <div className="event-detail-info-grid">
              {(startDate || endDate) && (
                <div className="event-detail-info-item">
                  <div
                    className="event-detail-info-icon"
                    aria-hidden="true"
                  >
                    📅
                  </div>

                  <div>
                    <p className="event-detail-info-label">
                      開催日程
                    </p>

                    <p className="event-detail-info-value">
                      {startDate || "未定"}

                      {endDate &&
                        endDate !== startDate &&
                        ` 〜 ${endDate}`}
                    </p>
                  </div>
                </div>
              )}


              {event.venue && (
                <div className="event-detail-info-item">
                  <div
                    className="event-detail-info-icon"
                    aria-hidden="true"
                  >
                    📍
                  </div>

                  <div>
                    <p className="event-detail-info-label">
                      会場
                    </p>

                    <p className="event-detail-info-value">
                      {event.venue}
                    </p>
                  </div>
                </div>
              )}


              {scheduleItems.length > 0 && (
                <div className="event-detail-info-block">
                  <div className="event-detail-info-block-heading">
                    <span aria-hidden="true">
                      🕐
                    </span>

                    <p className="event-detail-info-label">
                      時間
                    </p>
                  </div>

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
                </div>
              )}


              {event.officialUrl && (
                <div className="event-detail-info-block">
                  <div className="event-detail-info-block-heading">
                    <span aria-hidden="true">
                      🔗
                    </span>

                    <p className="event-detail-info-label">
                      公式サイト
                    </p>
                  </div>

                  <a
                    className="event-detail-official-link"
                    href={event.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    公式サイトを開く ↗
                  </a>
                </div>
              )}


              {event.memo && (
                <div className="event-detail-info-block">
                  <div className="event-detail-info-block-heading">
                    <span aria-hidden="true">
                      📝
                    </span>

                    <p className="event-detail-info-label">
                      メモ
                    </p>
                  </div>

                  <p className="event-detail-memo">
                    {event.memo}
                  </p>
                </div>
              )}


              {!startDate &&
                !endDate &&
                !event.venue &&
                scheduleItems.length === 0 &&
                !event.officialUrl &&
                !event.memo && (
                  <div className="event-detail-empty-info">
                    <p>
                      まだイベントの詳細情報は登録されていません。
                    </p>
                  </div>
                )}
            </div>
          </section>


          <section
            className="event-memo-section"
            aria-labelledby="event-memo-heading"
          >
            <div className="event-memo-heading">
              <p className="section-label">
                OSHI-MEMO
              </p>

              <h2 id="event-memo-heading">
                このイベントのメモ
              </h2>

              <p>
                チケット、買い物、代行、やることなど、
                必要になった情報を追加して管理できます。
              </p>
            </div>


            <div className="event-memo-empty">
              <div
                className="event-memo-empty-icon"
                aria-hidden="true"
              >
                ♡
              </div>

              <h3>
                まだメモはありません
              </h3>

              <p>
                このイベントについて覚えておきたいことを
                メモしておきましょう。
              </p>

              <button
                className="event-add-memo-button"
                type="button"
                onClick={() => {
                  /*
                    次の工程で
                    /events/:eventId/memos/new
                    へ遷移させる。
                  */
                }}
              >
                ＋ メモを追加
              </button>
            </div>
          </section>


          <section className="event-detail-management">
            <p className="event-detail-management-label">
              イベントの管理
            </p>

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
        <section className="event-detail-edit-section">
          <div className="event-detail-edit-heading">
            <p className="section-label">
              EDIT EVENT
            </p>

            <h1>
              イベントを編集
            </h1>

            <p>
              {event.title}
            </p>
          </div>

          <EventForm
            editingEvent={event}
            onSaveEvent={handleSaveEvent}
            onCancel={() => {
              setIsEditing(false);

              window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
              });
            }}
          />
        </section>
      )}
    </main>
  );
}

export default EventDetailPage;