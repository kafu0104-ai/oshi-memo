import { useEffect, useState, type FormEvent } from "react";
import type {
  Event,
  EventScheduleItem,
} from "../../types/Event";
import { DEFAULT_EVENT_TAGS } from "../../types/EventTag";

interface EventFormProps {
  onSaveEvent: (event: Event) => void;
  onCancel: () => void;
  editingEvent?: Event | null;
}

type ScheduleType = EventScheduleItem["type"];

interface ScheduleDefinition {
  type: ScheduleType;
  label: string;
}

const LIVE_SCHEDULE: ScheduleDefinition[] = [
  { type: "doorsOpen", label: "開場" },
  { type: "start", label: "開演" },
  { type: "expectedEnd", label: "終演予定" },
];

const MOVIE_SCHEDULE: ScheduleDefinition[] = [
  { type: "screeningStart", label: "上映開始" },
  { type: "screeningEnd", label: "上映終了" },
];

const TALK_WITH_MOVIE_SCHEDULE: ScheduleDefinition[] = [
  { type: "talkStart", label: "トーク開始" },
  { type: "talkEnd", label: "トーク終了" },
];

function EventForm({
  onSaveEvent,
  onCancel,
  editingEvent = null,
}: EventFormProps) {
  const [title, setTitle] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [schedule, setSchedule] = useState<EventScheduleItem[]>([]);

  const [venue, setVenue] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [memo, setMemo] = useState("");

  const isEditing = Boolean(editingEvent);

  const hasLiveTag =
    selectedTagIds.includes("live") ||
    selectedTagIds.includes("stage");

  const hasMovieTag = selectedTagIds.includes("movie");
  const hasTalkTag = selectedTagIds.includes("talk");

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setSelectedTagIds(editingEvent.tagIds ?? []);
      setStartDate(editingEvent.startDate);
      setEndDate(editingEvent.endDate);
      setSchedule(editingEvent.schedule ?? []);
      setVenue(editingEvent.venue);
      setOfficialUrl(editingEvent.officialUrl ?? "");
      setMemo(editingEvent.memo ?? "");
    } else {
      setTitle("");
      setSelectedTagIds([]);
      setStartDate("");
      setEndDate("");
      setSchedule([]);
      setVenue("");
      setOfficialUrl("");
      setMemo("");
    }
  }, [editingEvent]);

  const getScheduleValue = (type: ScheduleType) => {
    return (
      schedule.find((item) => item.type === type)?.time ?? ""
    );
  };

  const updateScheduleItem = (
    type: ScheduleType,
    label: string,
    time: string
  ) => {
    setSchedule((currentSchedule) => {
      const existingItem = currentSchedule.find(
        (item) => item.type === type
      );

      if (existingItem) {
        return currentSchedule.map((item) =>
          item.type === type
            ? {
                ...item,
                label,
                time,
              }
            : item
        );
      }

      return [
        ...currentSchedule,
        {
          id: crypto.randomUUID(),
          type,
          label,
          time,
        },
      ];
    });
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((currentTagIds) => {
      if (currentTagIds.includes(tagId)) {
        return currentTagIds.filter(
          (currentTagId) => currentTagId !== tagId
        );
      }

      return [...currentTagIds, tagId];
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      alert("イベント名を入力してください。");
      return;
    }

    const savedEvent: Event = {
      id: editingEvent?.id ?? crypto.randomUUID(),
      title: trimmedTitle,
      tagIds: selectedTagIds,
      startDate,
      endDate,
      schedule,
      venue: venue.trim(),
      officialUrl: officialUrl.trim() || undefined,
      memo: memo.trim() || undefined,
    };

    onSaveEvent(savedEvent);
  };

  const renderScheduleField = ({
    type,
    label,
  }: ScheduleDefinition) => {
    return (
      <div className="form-field-half" key={type}>
        <label htmlFor={`schedule-${type}`}>
          {label}
        </label>

        <input
          id={`schedule-${type}`}
          type="time"
          value={getScheduleValue(type)}
          onChange={(event) =>
            updateScheduleItem(
              type,
              label,
              event.target.value
            )
          }
        />
      </div>
    );
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
            {isEditing
              ? "イベントを編集"
              : "新しいイベント"}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-field-full">
          <label htmlFor="event-title">
            イベント名 *
          </label>

          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="例：うたの☆プリンスさまっ♪ GRAND SHOP"
            required
          />
        </div>

        <div className="event-tag-field">
          <div>
            <span className="event-tag-label">
              イベントタグ
            </span>

            <p className="event-tag-description">
              当てはまるものを複数選択できます
            </p>
          </div>

          <div className="event-tag-list">
            {DEFAULT_EVENT_TAGS.map((tag) => {
              const isSelected =
                selectedTagIds.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  className={
                    isSelected
                      ? "event-tag-button is-selected"
                      : "event-tag-button"
                  }
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    handleToggleTag(tag.id)
                  }
                >
                  {isSelected && (
                    <span aria-hidden="true">
                      ✓{" "}
                    </span>
                  )}

                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-field-half">
          <label htmlFor="event-start-date">
            開始日
          </label>

          <input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
          />
        </div>

        <div className="form-field-half">
          <label htmlFor="event-end-date">
            終了日
          </label>

          <input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
          />
        </div>

        {hasLiveTag &&
          LIVE_SCHEDULE.map(renderScheduleField)}

        {hasMovieTag &&
          MOVIE_SCHEDULE.map(renderScheduleField)}

        {hasMovieTag &&
          hasTalkTag &&
          TALK_WITH_MOVIE_SCHEDULE.map(
            renderScheduleField
          )}

        {hasTalkTag && !hasMovieTag && (
          <>
            {LIVE_SCHEDULE.map(renderScheduleField)}
          </>
        )}

        <div className="form-field-full">
          <label htmlFor="event-venue">
            会場名
          </label>

          <input
            id="event-venue"
            type="text"
            value={venue}
            onChange={(event) =>
              setVenue(event.target.value)
            }
            placeholder="例：池袋・サンシャインシティ"
          />
        </div>

        <div className="form-field-full">
          <label htmlFor="event-official-url">
            公式サイトURL
          </label>

          <input
            id="event-official-url"
            type="url"
            value={officialUrl}
            onChange={(event) =>
              setOfficialUrl(event.target.value)
            }
            placeholder="https://example.com"
          />
        </div>

        <div className="form-field-full">
          <label htmlFor="event-memo">
            メモ
          </label>

          <textarea
            id="event-memo"
            value={memo}
            onChange={(event) =>
              setMemo(event.target.value)
            }
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
            {isEditing
              ? "変更を保存"
              : "イベントを追加"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EventForm;