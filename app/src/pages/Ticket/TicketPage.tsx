import { useState } from "react";
import {
  Link,
  useParams,
} from "react-router";

import { OshiIcon } from "../../components/common/OshiIcon";

import {
  loadEvents,
  loadTicketByEventId,
  saveTicket,
} from "../../services/storage";

import type { Event } from "../../types/Event";
import type {
  Ticket,
  TicketReception,
} from "../../types/Ticket";

function createId(): string {
  return crypto.randomUUID();
}

function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  return date.replaceAll("-", "/");
}

function formatDateTime(
  date?: string,
  time?: string,
): string {
  if (!date && !time) {
    return "未設定";
  }

  const formattedDate = date
    ? formatDate(date)
    : "";

  if (formattedDate && time) {
    return `${formattedDate} ${time}`;
  }

  return formattedDate || time || "未設定";
}

function TicketPage() {
  const { eventId } = useParams();

  const [events] = useState<Event[]>(
    () => loadEvents(),
  );

  const [ticket, setTicket] =
    useState<Ticket | undefined>(() => {
      if (!eventId) {
        return undefined;
      }

      return loadTicketByEventId(eventId);
    });

  const [isAddingReception, setIsAddingReception] =
    useState(false);

  const [receptionName, setReceptionName] =
    useState("");

  const [
    applicationStartDate,
    setApplicationStartDate,
  ] = useState("");

  const [
    applicationStartTime,
    setApplicationStartTime,
  ] = useState("");

  const [
    applicationDeadlineDate,
    setApplicationDeadlineDate,
  ] = useState("");

  const [
    applicationDeadlineTime,
    setApplicationDeadlineTime,
  ] = useState("");

  const [resultDate, setResultDate] =
    useState("");

  const [resultTime, setResultTime] =
    useState("");

  const [memo, setMemo] =
    useState("");

  const event = events.find(
    (currentEvent) =>
      currentEvent.id === eventId,
  );

  const resetReceptionForm = () => {
    setReceptionName("");
    setApplicationStartDate("");
    setApplicationStartTime("");
    setApplicationDeadlineDate("");
    setApplicationDeadlineTime("");
    setResultDate("");
    setResultTime("");
    setMemo("");
  };

  const handleCancelReception = () => {
    resetReceptionForm();
    setIsAddingReception(false);
  };

  const handleSaveReception = () => {
    if (!eventId) {
      return;
    }

    const trimmedName =
      receptionName.trim();

    if (!trimmedName) {
      window.alert(
        "受付名を入力してください。",
      );
      return;
    }

    const newReception: TicketReception = {
      id: createId(),
      name: trimmedName,

      applicationStartDate:
        applicationStartDate || undefined,

      applicationStartTime:
        applicationStartTime || undefined,

      applicationDeadlineDate:
        applicationDeadlineDate || undefined,

      applicationDeadlineTime:
        applicationDeadlineTime || undefined,

      resultDate:
        resultDate || undefined,

      resultTime:
        resultTime || undefined,

      seatTypes: [],
      fees: [],
      applications: [],

      memo:
        memo.trim() || undefined,
    };

    const nextTicket: Ticket = ticket
      ? {
          ...ticket,
          receptions: [
            ...ticket.receptions,
            newReception,
          ],
        }
      : {
          id: createId(),
          eventId,
          receptions: [
            newReception,
          ],
        };

    saveTicket(nextTicket);
    setTicket(nextTicket);

    resetReceptionForm();
    setIsAddingReception(false);
  };

  if (!eventId || !event) {
    return (
      <main>
        <header className="page-header">
          <p className="page-eyebrow">
            TICKET
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

  const receptions =
    ticket?.receptions ?? [];

  return (
    <main className="event-detail-page">
      <div className="event-detail-back">
        <Link
          className="text-link"
          to={`/events/${event.id}`}
        >
          ← イベント詳細へ戻る
        </Link>
      </div>

      <article className="event-detail-sheet">
        <header className="event-detail-header">
          <p className="page-eyebrow">
            TICKET
          </p>

          <h1>
            チケット・申込
          </h1>

          <p>
            {event.title}
          </p>
        </header>

        <section
          className="event-memo-section"
          aria-labelledby="ticket-reception-heading"
        >
          <div className="event-memo-heading">
            <p className="section-label">
              RECEPTION
            </p>

            <h2 id="ticket-reception-heading">
              受付情報
            </h2>

            <p>
              先行・申込・当落など、
              チケットの受付単位で管理します。
            </p>
          </div>

          {receptions.length > 0 && (
            <div className="event-module-list">
              {receptions.map(
                (reception) => (
                  <article
                    className="event-module-card"
                    key={reception.id}
                  >
                    <div className="event-module-icon">
                      <OshiIcon
                        name="ticket"
                        size={38}
                        alt=""
                      />
                    </div>

                    <div className="event-module-content">
                      <h3>
                        {reception.name}
                      </h3>

                      <div className="ticket-reception-summary">
                        <p>
                          <strong>
                            申込開始：
                          </strong>{" "}
                          {formatDateTime(
                            reception.applicationStartDate,
                            reception.applicationStartTime,
                          )}
                        </p>

                        <p>
                          <strong>
                            申込締切：
                          </strong>{" "}
                          {formatDateTime(
                            reception.applicationDeadlineDate,
                            reception.applicationDeadlineTime,
                          )}
                        </p>

                        <p>
                          <strong>
                            当落発表：
                          </strong>{" "}
                          {formatDateTime(
                            reception.resultDate,
                            reception.resultTime,
                          )}
                        </p>
                      </div>

                      {reception.memo && (
                        <p>
                          {reception.memo}
                        </p>
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}

          {!isAddingReception &&
            receptions.length === 0 && (
              <div className="event-module-empty">
                <OshiIcon
                  name="ticket"
                  size={32}
                  alt=""
                />

                <h3>
                  受付はまだ登録されていません
                </h3>

                <p>
                  FC先行・シリアル先行・一般販売など、
                  チケットの受付情報を登録できます。
                </p>

                <button
                  type="button"
                  className="event-module-button"
                  onClick={() =>
                    setIsAddingReception(true)
                  }
                >
                  <OshiIcon
                    name="add"
                    size={18}
                    alt=""
                  />

                  <span>
                    受付を追加
                  </span>
                </button>
              </div>
            )}

          {!isAddingReception &&
            receptions.length > 0 && (
              <div className="event-other-memo">
                <button
                  type="button"
                  className="event-other-memo-button"
                  onClick={() =>
                    setIsAddingReception(true)
                  }
                >
                  <OshiIcon
                    name="add"
                    size={18}
                    alt=""
                  />

                  <span>
                    受付を追加
                  </span>
                </button>
              </div>
            )}

          {isAddingReception && (
            <div className="event-detail-edit-section">
              <div className="event-detail-edit-heading">
                <p className="section-label">
                  ADD RECEPTION
                </p>

                <h2>
                  受付を追加
                </h2>

                <p>
                  FC先行・シリアル先行・一般販売など、
                  ひとつの受付単位で登録します。
                </p>
              </div>

              <div className="form-stack">
                <label className="form-field">
                  <span>
                    受付名
                  </span>

                  <input
                    type="text"
                    value={receptionName}
                    onChange={(event) =>
                      setReceptionName(
                        event.target.value,
                      )
                    }
                    placeholder="例：FC先行"
                  />
                </label>

                <div className="form-field">
                  <span>
                    申込開始
                  </span>

                  <div className="form-row">
                    <input
                      type="date"
                      value={
                        applicationStartDate
                      }
                      onChange={(event) =>
                        setApplicationStartDate(
                          event.target.value,
                        )
                      }
                    />

                    <input
                      type="time"
                      value={
                        applicationStartTime
                      }
                      onChange={(event) =>
                        setApplicationStartTime(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="form-field">
                  <span>
                    申込締切
                  </span>

                  <div className="form-row">
                    <input
                      type="date"
                      value={
                        applicationDeadlineDate
                      }
                      onChange={(event) =>
                        setApplicationDeadlineDate(
                          event.target.value,
                        )
                      }
                    />

                    <input
                      type="time"
                      value={
                        applicationDeadlineTime
                      }
                      onChange={(event) =>
                        setApplicationDeadlineTime(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="form-field">
                  <span>
                    当落発表
                  </span>

                  <div className="form-row">
                    <input
                      type="date"
                      value={resultDate}
                      onChange={(event) =>
                        setResultDate(
                          event.target.value,
                        )
                      }
                    />

                    <input
                      type="time"
                      value={resultTime}
                      onChange={(event) =>
                        setResultTime(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <label className="form-field">
                  <span>
                    メモ
                  </span>

                  <textarea
                    value={memo}
                    onChange={(event) =>
                      setMemo(
                        event.target.value,
                      )
                    }
                    placeholder="受付についての補足があれば入力"
                    rows={4}
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      handleCancelReception
                    }
                  >
                    キャンセル
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handleSaveReception
                    }
                  >
                    受付を登録
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </article>
    </main>
  );
}

export default TicketPage;