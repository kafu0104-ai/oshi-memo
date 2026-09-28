import GenreSummary from "../../components/event/GenreSummary";
import { isLottery, receptionDates, receptionStatuses } from "../../services/ticketReception";
import VenueMapLink from "../../components/common/VenueMapLink";
import { useEffect, useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import { OshiIcon } from "../../components/common/OshiIcon";
import EventForm from "../../components/event/EventForm";
import { hasShoppingMemo, shoppingKey } from "../../services/shopping";

import {
  loadEvents,
  loadTicketByEventId,
  saveEvents,
} from "../../services/storage";

import type { Event } from "../../types/Event";
import { DEFAULT_EVENT_TAGS } from "../../types/EventTag";

interface EventDetailLocationState {
  justCreated?: boolean;
}

const PERFORMANCE_PREVIEW_COUNT = 4;

const TICKET_RECOMMENDED_TAG_IDS = [
  "live",
  "stage",
  "movie",
  "talk",
  "exhibition",
];

const SHOPPING_RECOMMENDED_TAG_IDS = [
  "goods-sale",
  "online-sale",
  "collaboration-food",
];

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

  const [isEditing, setIsEditing] =
    useState(false);

  const [
    showAllPerformances,
    setShowAllPerformances,
  ] = useState(false);

  const [
    showCreatedMessage,
    setShowCreatedMessage,
  ] = useState(
    Boolean(locationState?.justCreated)
  );

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" }));
    } else window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    setShowAllPerformances(false);
  }, [eventId, location.hash]);

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
    (currentEvent) =>
      currentEvent.id === eventId
  );

  if (!event) {
    return (
      <main>
        <header className="page-header">
          <p className="page-eyebrow">
            EVENT
          </p>

          <h1>
            イベントが見つかりません
          </h1>

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

  const selectedTags =
    DEFAULT_EVENT_TAGS.filter((tag) =>
      event.tagIds?.includes(tag.id)
    );

  const scheduleItems =
    event.schedule?.filter(
      (item) =>
        item.time.trim() !== ""
    ) ?? [];

  const performances =
    event.performances?.filter(
      (performance) =>
        performance.date ||
        performance.name ||
        performance.schedule.some(
          (item) =>
            item.time.trim() !== ""
        ) ||
        performance.memo
    ) ?? [];

  const hasHiddenPerformances =
    performances.length >
    PERFORMANCE_PREVIEW_COUNT;

  const visiblePerformances =
    showAllPerformances
      ? performances
      : performances.slice(
          0,
          PERFORMANCE_PREVIEW_COUNT
        );

  const hiddenPerformanceCount =
    Math.max(
      performances.length -
        PERFORMANCE_PREVIEW_COUNT,
      0
    );

  const startDate =
    formatDate(event.startDate);

  const endDate =
    formatDate(event.endDate);

  const ticketReceptions = eventId ? (loadTicketByEventId(eventId)?.receptions ?? []) : [];
  const shoppingExists = hasShoppingMemo(eventId ?? "");
  const hasTicketInformation = ticketReceptions.length > 0;

  const shouldRecommendTicket =
    event.tagIds?.some((tagId) =>
      TICKET_RECOMMENDED_TAG_IDS.includes(
        tagId
      )
    ) ?? false;

  const shouldRecommendShopping =
    event.tagIds?.some((tagId) =>
      SHOPPING_RECOMMENDED_TAG_IDS.includes(
        tagId
      )
    ) ?? false;

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
    setShowAllPerformances(false);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteEvent = () => {
    const shouldDelete =
      window.confirm(
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
    localStorage.removeItem(shoppingKey(event.id));

    navigate("/events");
  };

  if (isEditing) {
    return (
      <main className="event-detail-page">
        <div className="event-detail-back">
          <button
            className="event-detail-back-button"
            type="button"
            onClick={() => {
              setIsEditing(false);

              window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
              });
            }}
          >
            ← イベント詳細へ戻る
          </button>
        </div>

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
            onSaveEvent={
              handleSaveEvent
            }
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
      </main>
    );
  }

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

      {showCreatedMessage && (
        <div
          className="event-created-message"
          role="status"
        >
          <OshiIcon
            name="complete"
            size={28}
            alt=""
          />

          <div>
            <strong>
              イベントを登録しました
            </strong>

            <p>
              必要な情報を追加して管理していきましょう。
            </p>
          </div>
        </div>
      )}

      <article className="event-detail-sheet">
        <header className="event-detail-header">
          <div className="event-detail-actions">
  <button
    className="event-edit-button"
    type="button"
    aria-label="イベントを編集"
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
    <OshiIcon
      name="edit"
      size={28}
      alt=""
    />
  </button>

  <button
    className="event-delete-button"
    type="button"
    aria-label="イベントを削除"
    onClick={handleDeleteEvent}
  >
    <OshiIcon
      name="delete"
      size={28}
      alt=""
    />
  </button>
</div>

          <p className="page-eyebrow">
            EVENT
          </p>

          <h1>
            {event.title}
          </h1>

          {selectedTags.length > 0 && (
            <div className="event-detail-tags">
              {selectedTags.map(
                (tag) => (
                  <span
                    className="event-detail-tag"
                    key={tag.id}
                  >
                    {tag.name}
                  </span>
                )
              )}
            </div>
          )}
        </header>

        <section
          className="event-detail-information"
          aria-labelledby="event-info-heading"
        >
          <div className="event-detail-section-heading">
            <p className="section-label">
              EVENT INFORMATION
            </p>

            <h2 id="event-info-heading">
              イベント情報
            </h2>
          </div>

          <div className="event-detail-info-grid">
            {(startDate ||
              endDate) && (
              <div className="event-detail-info-item">
                <span
                  className="event-detail-info-icon"
                  aria-hidden="true"
                >
                  <OshiIcon
                    name="schedule"
                    size={28}
                    alt=""
                  />
                </span>

                <div className="event-detail-info-content">
                  <p className="event-detail-info-label">
                    開催日程
                  </p>

                  <p className="event-detail-info-value">
                    {startDate ||
                      "未定"}

                    {endDate &&
                      endDate !==
                        startDate &&
                      ` 〜 ${endDate}`}
                  </p>
                </div>
              </div>
            )}

            {performances.length >
              0 && (
              <div className="event-detail-info-item event-detail-info-item-full">
                <span
                  className="event-detail-info-icon"
                  aria-hidden="true"
                >
                  <OshiIcon
                    name="live-concert"
                    size={28}
                    alt=""
                  />
                </span>

                <div className="event-detail-info-content">
                  <div className="event-detail-performance-title-row">
                    <p className="event-detail-info-label">
                      公演スケジュール
                    </p>

                    <span className="event-detail-performance-count">
                      全
                      {performances.length}
                      公演
                    </span>
                  </div>

                  <div className="event-detail-performance-compact-list">
                    {visiblePerformances.map(
                      (
                        performance,
                        index
                      ) => {
                        const performanceSchedule =
                          performance.schedule.filter(
                            (item) =>
                              item.time.trim() !==
                              ""
                          );

                        return (
                          <div
                            className="event-detail-performance-compact-row"
                            key={
                              performance.id
                            }
                          >
                            <div className="event-detail-performance-compact-main">
                              <div className="event-detail-performance-compact-name">
                                <span className="event-detail-performance-compact-date">
                                  {performance.date
                                    ? formatDate(
                                        performance.date
                                      )
                                    : "日付未定"}
                                </span>

                                <strong>
                                  {performance.name ||
                                    `公演回 ${
                                      index + 1
                                    }`}
                                </strong>
                              </div>

                              {performanceSchedule.length >
                                0 && (
                                <div className="event-detail-performance-compact-times">
                                  {performanceSchedule.map(
                                    (
                                      item
                                    ) => (
                                      <div
                                        className="event-detail-performance-compact-time"
                                        key={
                                          item.id
                                        }
                                      >
                                        <span>
                                          {
                                            item.label
                                          }
                                        </span>

                                        <strong>
                                          {
                                            item.time
                                          }
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>

                            {performance.memo && (
                              <p className="event-detail-performance-compact-memo">
                                {
                                  performance.memo
                                }
                              </p>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>

                  {hasHiddenPerformances && (
                    <div className="event-detail-performance-toggle">
                      <button
                        className="event-detail-performance-toggle-button"
                        type="button"
                        aria-expanded={
                          showAllPerformances
                        }
                        onClick={() =>
                          setShowAllPerformances(
                            (
                              currentValue
                            ) =>
                              !currentValue
                          )
                        }
                      >
                        {showAllPerformances
                          ? "公演スケジュールを閉じる"
                          : `残り${hiddenPerformanceCount}公演を表示`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scheduleItems.length >
              0 &&
              performances.length ===
                0 && (
                <div className="event-detail-info-item">
                  <span
                    className="event-detail-info-icon"
                    aria-hidden="true"
                  >
                    <OshiIcon
                      name="schedule"
                      size={28}
                      alt=""
                    />
                  </span>

                  <div className="event-detail-info-content">
                    <p className="event-detail-info-label">
                      時間
                    </p>

                    <div className="event-detail-schedule">
                      {scheduleItems.map(
                        (item) => (
                          <div
                            className="event-detail-schedule-row"
                            key={
                              item.id
                            }
                          >
                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong>
                              {
                                item.time
                              }
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            {event.venue && (
              <div className="event-detail-info-item">
                <span
                  className="event-detail-info-icon"
                  aria-hidden="true"
                >
                  <OshiIcon
                    name="place"
                    size={28}
                    alt=""
                  />
                </span>

                <div className="event-detail-info-content">
                  <p className="event-detail-info-label">
                    会場
                  </p>

                  <p className="event-detail-info-value">
                    {event.venue}
                  </p>
                  <VenueMapLink venue={event.venue} />
                </div>
              </div>
            )}

            {event.officialUrl && (
              <div className="event-detail-info-item">
                <span
                  className="event-detail-info-icon"
                  aria-hidden="true"
                >
                  <OshiIcon
                    name="external-link"
                    size={28}
                    alt=""
                  />
                </span>

                <div className="event-detail-info-content">
                  <p className="event-detail-info-label">
                    公式サイト
                  </p>

                  <a
                    className="event-detail-official-link"
                    href={
                      event.officialUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    公式サイトを開く
                  </a>
                </div>
              </div>
            )}

            {event.memo && (
              <div className="event-detail-info-item event-detail-info-item-full">
                <span
                  className="event-detail-info-icon"
                  aria-hidden="true"
                >
                  <OshiIcon
                    name="free-memo"
                    size={28}
                    alt=""
                  />
                </span>

                <div className="event-detail-info-content">
                  <p className="event-detail-info-label">
                    イベント補足
                  </p>

                  <p className="event-detail-memo">
                    {event.memo}
                  </p>
                </div>
              </div>
            )}

            {!startDate &&
              !endDate &&
              scheduleItems.length ===
                0 &&
              performances.length ===
                0 &&
              !event.venue &&
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

        <GenreSummary event={event}/>
        <section
          className="event-memo-section"
          aria-labelledby="event-memo-heading"
        >
          <div className="event-memo-heading">
            <p className="section-label">
              OSHI-MEMO
            </p>

            <h2 id="event-memo-heading">
              このイベントの管理
            </h2>

            <p>
              イベントの種類に合わせて、
              必要になりそうな管理機能を表示しています。
            </p>
          </div>

          <div className="event-module-list">
            {(shouldRecommendTicket || hasTicketInformation) && (
              <article className="event-module-card event-ticket-card">
                <div className="event-module-icon">
                  <OshiIcon
                    name="ticket"
                    size={38}
                    alt=""
                  />
                </div>

                <div className="event-module-content">
                  <div className="event-ticket-heading"><h3>チケット情報</h3>
                    {ticketReceptions.length === 1 && <Link className="event-ticket-edit" to={`/events/${event.id}/tickets/${ticketReceptions[0].id}/edit`} aria-label={`${ticketReceptions[0].name}を編集`} title="編集"><OshiIcon name="edit" size={28} alt="" /></Link>}
                  </div>
                  {hasTicketInformation ? (
                    <div className="event-ticket-list">
                      {ticketReceptions.map(reception => (
                        <section className="event-ticket-summary" key={reception.id} aria-labelledby={`ticket-${reception.id}`}>
                          <div className="event-ticket-heading"><h4 id={`ticket-${reception.id}`}>{reception.name}</h4>
                            {ticketReceptions.length > 1 && <Link className="event-ticket-edit" to={`/events/${event.id}/tickets/${reception.id}/edit`} aria-label={`${reception.name}を編集`} title="編集"><OshiIcon name="edit" size={28} alt="" /></Link>}
                          </div>
                          {reception.applications.map((application, index) => <p className="icon-heading" key={application.id}>
                            {isLottery(reception) && (application.status === "won" || application.status === "lost") && <OshiIcon name={application.status} size={24} alt="" />}
                            {reception.seatTypes.find(seat => seat.id === application.seatTypeId)?.name ?? `${isLottery(reception) ? "申込" : "購入"} ${index + 1}`}：{receptionStatuses(reception)[application.status]}
                          </p>)}
                          <dl>
                            {receptionDates(reception).map(([label, dateKey, timeKey]) => [label, reception[dateKey], reception[timeKey]]).map(([label, date, time]) => (date || time) && (
                              <div key={label}><dt>{label}</dt><dd>{[date ? formatDate(date) : "", time].filter(Boolean).join(" ")}</dd></div>
                            ))}
                            {reception.seatTypes?.map(seat => <div key={seat.id}><dt>{seat.name || "チケット"}{seat.hasBenefit ? "（特典あり）" : ""}</dt><dd>{seat.price.toLocaleString("ja-JP")}円／枚</dd></div>)}
                            {reception.fees?.map(fee => <div key={fee.id}><dt>{fee.name}</dt><dd>{fee.amount.toLocaleString("ja-JP")}円（{fee.unit === "perTicket" ? "1枚ごと" : "1申込ごと"}）</dd></div>)}
                          </dl>
                          {reception.memo && <p className="event-ticket-memo">{reception.memo}</p>}
                        </section>
                      ))}
                    </div>
                  ) : <p>申込・販売日程・券種・料金・手数料を登録できます。</p>}
                </div>
                  <Link className="event-ticket-add" to={`/events/${event.id}/tickets`}>
                    <span className="event-ticket-add-icon" aria-hidden="true">＋</span>
                    <span>{hasTicketInformation ? "チケット情報を追加" : "チケット情報を登録"}</span>
                  </Link>
              </article>
            )}

            {(shouldRecommendShopping || shoppingExists) && (
              <article className="event-module-card">
                <div className="event-module-icon">
                  <OshiIcon
                    name="shopping-memo"
                    size={38}
                    alt=""
                  />
                </div>

                <div className="event-module-content">
                  <h3>
                    買い物メモ
                  </h3>

                  <p>
                    このイベントで購入したい商品や、
                    購入したグッズをまとめて管理できます。
                  </p>

                  <Link className="event-ticket-add" to={`/events/${event.id}/shopping`}>
                    <OshiIcon name={shoppingExists ? "shopping-memo" : "add"} size={18} alt="" />
                    <span>{shoppingExists ? "買い物メモを開く" : "買い物メモを追加"}</span>
                  </Link>
                </div>
              </article>
            )}

            {!shouldRecommendTicket && !hasTicketInformation &&
              !shouldRecommendShopping && (
                <div className="event-module-empty">
                  <div
                    className="event-memo-empty-icon"
                    aria-hidden="true"
                  >
                    <OshiIcon
                      name="oshi"
                      size={38}
                      alt=""
                    />
                  </div>

                  <h3>
                    管理情報を追加できます
                  </h3>

                  <p>
                    必要になった機能を、
                    このイベントに追加して管理できます。
                  </p>
                </div>
              )}
          </div>

          <div className="event-other-memo">
            <button
              className="event-other-memo-button"
              type="button"
              onClick={() => {
                /*
                  将来、
                  チケット・買い物・代行・やること等を
                  任意追加する画面へ接続します。
                */
              }}
            >
              <OshiIcon
                name="add"
                size={18}
                alt=""
              />
              <span>
                その他の管理を追加
              </span>
            </button>
          </div>
        </section>
      </article>
    </main>
  );
}

export default EventDetailPage;