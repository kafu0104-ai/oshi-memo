import DeleteReception from "./DeleteReception";
import { receptionDates } from "../../services/ticketReception";
import { generateId } from "../../services/id";
import { useState } from "react";
import ReceptionForm from "./ReceptionForm";
import {
  Link,
  useParams,
} from "react-router";

import { OshiIcon } from "../../components/common/OshiIcon";

import {
  loadEvents,
  loadTicketByEventId,
  saveTicketWithCompanions,
} from "../../services/storage";

import type { Companion } from "../../types/Companion";
import type { Event } from "../../types/Event";
import type {
  Ticket,
  TicketReception,
} from "../../types/Ticket";

function createId(): string {
  return generateId();
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

  const [editingReception, setEditingReception] = useState<TicketReception>();
  const [message, setMessage] = useState("");

  const event = events.find(
    (currentEvent) =>
      currentEvent.id === eventId,
  );

  const handleSaveReception = (reception: TicketReception, newCompanions: Companion[]) => {
    if (!eventId) return;
    const current = loadTicketByEventId(eventId) ?? ticket;
    const existing = current?.receptions.find(item => item.id === reception.id);
    if (editingReception && !existing) throw new Error("チケット情報が見つかりません。ページを再読み込みしてください。");
    const updated = { ...existing, ...reception, applications: reception.applications };
    const next: Ticket = current
      ? { ...current, receptions: existing ? current.receptions.map(item => item.id === updated.id ? updated : item) : [...current.receptions, updated] }
      : { id: createId(), eventId, receptions: [updated] };
    saveTicketWithCompanions(next, newCompanions);
    setTicket(next);
    setMessage(editingReception ? "チケット情報を更新しました。" : "チケット情報を登録しました。");
    setEditingReception(undefined);
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
          className="task-navigation-button"
          to="/events"
        >
          イベント一覧に戻る
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
          className="task-navigation-button"
          to="/tickets"
        >
          チケット一覧に戻る
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
              TICKET INFORMATION
            </p>

            <h2 id="ticket-reception-heading">
              チケット情報
            </h2>

            <p>
              申込日程・料金などを、
              先行・一般販売などの申込枠ごとに管理します。
            </p>
          </div>

          {message && <p role="status">{message}</p>}
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
                        {receptionDates(reception).map(([label, date, time]) => <p key={date}><strong>{label}：</strong> {formatDateTime(reception[date], reception[time])}</p>)}
                      </div>

                      {reception.seatTypes?.map(seat => <p key={seat.id}>{seat.name || "チケット"}{seat.hasBenefit ? "（特典あり）" : ""}：{seat.price.toLocaleString("ja-JP")}円／枚</p>)}
                      {reception.fees?.map(fee => <p key={fee.id}>{fee.name}：{fee.amount.toLocaleString("ja-JP")}円（{fee.unit === "perTicket" ? "1枚ごと" : "1申込ごと"}）</p>)}
                      <button type="button" className="secondary-button" disabled={isAddingReception} aria-label={`${reception.name}を編集`} onClick={() => {
                        setEditingReception(reception);
                        setIsAddingReception(true);
                        setMessage("");
                      }}>チケット情報を編集</button>
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
                  チケット情報はまだ登録されていません
                </h3>

                <p>
                  FC先行・シリアル先行・一般販売など、
                  チケット情報を登録できます。
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
                    チケット情報を追加
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
                    チケット情報を追加
                  </span>
                </button>
              </div>
            )}

          {isAddingReception && (
            <>
            <ReceptionForm sourceUrl={event.officialUrl} performances={event.performances} key={editingReception?.id ?? "new"}
              reception={editingReception}
              onSave={handleSaveReception}
              onCancel={() => { setIsAddingReception(false); setEditingReception(undefined); }}
            />
            {editingReception && <DeleteReception eventId={event.id} receptionId={editingReception.id} name={editingReception.name} onDeleted={() => {
              setTicket(loadTicketByEventId(event.id)); setIsAddingReception(false); setEditingReception(undefined); setMessage("チケット情報を削除しました。");
            }} />}
            </>
          )}
        </section>
      </article>
    </main>
  );
}

export default TicketPage;