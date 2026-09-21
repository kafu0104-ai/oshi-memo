import { useEffect, useState, type FormEvent } from "react";
import type { Event } from "../../types/Event";

interface EventFormProps {
  onSaveEvent: (event: Event) => void;
  onCancel: () => void;
  editingEvent?: Event | null;
}

function EventForm({
  onSaveEvent,
  onCancel,
  editingEvent = null,
}: EventFormProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [memo, setMemo] = useState("");

  const isEditing = Boolean(editingEvent);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setStartDate(editingEvent.startDate);
      setEndDate(editingEvent.endDate);
      setVenue(editingEvent.venue);
      setOfficialUrl(editingEvent.officialUrl ?? "");
      setMemo(editingEvent.memo ?? "");
    } else {
      setTitle("");
      setStartDate("");
      setEndDate("");
      setVenue("");
      setOfficialUrl("");
      setMemo("");
    }
  }, [editingEvent]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      alert("イベント・ライブ名を入力してください。");
      return;
    }

    const savedEvent: Event = {
      id: editingEvent?.id ?? crypto.randomUUID(),
      title: trimmedTitle,
      startDate,
      endDate,
      venue: venue.trim(),
      officialUrl: officialUrl.trim() || undefined,
      memo: memo.trim() || undefined,
    };

    onSaveEvent(savedEvent);
  };

  return (
    <section
      className="event-form-section"
      aria-labelledby="event-form-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-label">
            {isEditing ? "EDIT EVENT" : "NEW EVENT"}
          </p>

          <h2 id="event-form-heading">
            {isEditing ? "イベントを編集" : "新しいイベント"}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="event-title">イベント・ライブ名</label>
          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例：うたの☆プリンスさまっ♪ GRAND SHOP"
            required
          />
        </div>

        <div>
          <label htmlFor="event-start-date">開始日</label>
          <input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="event-end-date">終了日</label>
          <input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="event-venue">会場名</label>
          <input
            id="event-venue"
            type="text"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            placeholder="例：池袋P'PARCO"
          />
        </div>

        <div>
          <label htmlFor="event-official-url">公式サイトURL</label>
          <input
            id="event-official-url"
            type="url"
            value={officialUrl}
            onChange={(event) => setOfficialUrl(event.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label htmlFor="event-memo">メモ</label>
          <textarea
            id="event-memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="整理券、入場時間、確認事項など"
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
          >
            キャンセル
          </button>

          <button type="submit">
            {isEditing ? "変更を保存" : "イベントを追加"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EventForm;