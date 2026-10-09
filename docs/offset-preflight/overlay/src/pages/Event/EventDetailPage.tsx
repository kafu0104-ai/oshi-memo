import OffsetLinks from '../../components/common/OffsetLinks';
import OfficialSourceSummary from '../../components/event/OfficialSourceSummary';
import { isPastEvent } from "../../services/eventArchive";
import { useLocalToday } from "../../hooks/useLocalToday";
import type { EventTicketChanges } from "../../services/eventTicketDraft";
import GenreSummary from "../../components/event/GenreSummary";
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
import { shoppingForEvent, preserveEventShopping } from "../../services/shoppingMemos";

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
  const today = useLocalToday();
  const { eventId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const locationState =
    location.state as EventDetailLocationState | null;

  const [events, setEvents] = useState<Event[]>(
    () => loadEvents()
  );

  const [showManagementOptions, setShowManagementOptions] = useState(false);
  const [isEditing, setIsEditing] =
    useState(new URLSearchParams(location.search).get("edit") === "1");

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
        performance.date || performance.venue ||
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
  const shoppingExists = shoppingForEvent(eventId ?? "",events).length > 0;
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

  const showTicketModule = shouldRecommendTicket || hasTicketInformation;
  const showShoppingModule = shouldRecommendShopping || shoppingExists;
  const hasAdditionalManagement = !showTicketModule || !showShoppingModule;

  const handleSaveEvent = async (
    updatedEvent: Event, tickets?: EventTicketChanges
  ) => {
    const nextEvents = events.map(
      (currentEvent) =>
        currentEvent.id === updatedEvent.id
          ? updatedEvent
          : currentEvent
    );

    await saveEvents(nextEvents,tickets?{...tickets,eventId:updatedEvent.id}:undefined);
    setEvents(nextEvents);

    setIsEditing(false);
    setShowAllPerformances(false);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteEvent = async () => {
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

    preserveEventShopping(event);
    try { await saveEvents(nextEvents); } catch (error) { window.alert(error instanceof Error ? error.message : "削除できませんでした。"); return; }

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
          to={isPastEvent(event,today) ? "/events?view=past" : "/events"}
        >
          {isPastEvent(event,today) ? "← 過去のイベント" : "← イベント一覧"}
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

                              {performance.venue && <div><p>{performance.venue}</p><VenueMapLink venue={performance.venue}/></div>}
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

            {event.venue && event.liveFormat !== "tour" && (
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

            <OfficialSourceSummary report={event.officialImport}/>
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

        <GenreSummary event={event} receptions={ticketReceptions}/><OffsetLinks eventId={event.id}/>
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
            {showTicketModule && (
              <article className="event-module-card event-ticket-card">
                <div className="event-module-icon">
                  <OshiIcon
                    name="ticket"
                    size={38}
                    alt=""
                  />
                </div>

                <div className="event-module-content">
                  <h3>チケット情報</h3>
                  <p>{hasTicketInformation ? `登録済みのチケット情報：${ticketReceptions.length}件` : "申込・当落・支払いなどをまとめて管理できます。"}</p>
                </div>
                <Link className="event-ticket-add" to={hasTicketInformation ? `/events/${event.id}/tickets` : `/tickets/new?event=${event.id}`}>
                  {!hasTicketInformation && <span className="event-ticket-add-icon" aria-hidden="true">＋</span>}
                  <span>{hasTicketInformation ? "チケット情報を見る" : "チケットを追加"}</span>
                </Link>
              </article>
            )}

            {showShoppingModule && (
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

            {!showTicketModule && !showShoppingModule && (
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

          {hasAdditionalManagement && <div className="event-other-memo">
            <button
              className="event-other-memo-button"
              type="button"
              aria-expanded={showManagementOptions}
              aria-controls="additional-event-management"
              onClick={() => setShowManagementOptions(value=>!value)}
            >
              <OshiIcon
                name="add"
                size={18}
                alt=""
              />
              <span>
                {showManagementOptions ? '追加メニューを閉じる' : 'その他の管理を追加'}
              </span>
            </button>
            {showManagementOptions && <div id="additional-event-management" className="additional-event-management">
              {!showTicketModule && <Link className="task-navigation-button" to={`/events/${event.id}/tickets`}>チケット情報を追加</Link>}
              {!showShoppingModule && <Link className="task-navigation-button" to={`/events/${event.id}/shopping`}>買い物メモを追加</Link>}
            </div>}
          </div>}
        </section>
      </article>
    </main>
  );
}

export default EventDetailPage;