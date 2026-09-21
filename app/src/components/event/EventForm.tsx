import { useEffect, useState, type FormEvent } from "react";
import type { Event } from "../../types/Event";
import { DEFAULT_EVENT_TAGS } from "../../types/EventTag";

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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [schedule, setSchedule] = useState<Event["schedule"]>([]);

  const isEditing = Boolean(editingEvent);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setSelectedTagIds(editingEvent.tagIds ?? []);
      setStartDate(editingEvent.startDate);
      setEndDate(editingEvent.endDate);
      setVenue(editingEvent.venue);
      setOfficialUrl(editingEvent.officialUrl ?? "");
      setMemo(editingEvent.memo ?? "");
      setSchedule(editingEvent.schedule ?? []);
    } else {
      setTitle("");
      setSelectedTagIds([]);
      setStartDate("");
      setEndDate("");
      setVenue("");
      setOfficialUrl("");
      setMemo("");
      setSchedule([]);
    }
  }, [editingEvent]);

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

  const updateScheduleTime = (
    id: string,
    label: string,
    time: string
  ) => {
    setSchedule((currentSchedule = []) => {
      const existingItem = currentSchedule.find(
        (item) => item.id === id
      );

      if (existingItem) {
        return currentSchedule.map((item) =>
          item.id === id
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
          id,
          label,
          time,
        },
      ];
    });
  };

  const getScheduleTime = (id: string) => {
    return (
      schedule?.find((item) => item.id === id)?.time ?? ""
    );
  };

  const hasLiveOrStage =
    selectedTagIds.includes("live") ||
    selectedTagIds.includes("stage");

  const hasMovie = selectedTagIds.includes("movie");

  const hasTalk = selectedTagIds.includes("talk");

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
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
      venue: venue.trim(),
      officialUrl: officialUrl.trim() || undefined,
      memo: memo.trim() || undefined,
      schedule:
        schedule?.filter(
          (item) => item.time.trim() !== ""
        ) ?? [],
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
            {isEditing
              ? "イベントを編集"
              : "新しいイベント"}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-field form-field-full">
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

        <div className="event-tag-field form-field-full">
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

        <div className="form-field">
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

        <div className="form-field">
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

        {hasLiveOrStage && (
          <>
            <div className="form-field">
              <label htmlFor="doors-open">
                開場
              </label>

              <input
                id="doors-open"
                type="time"
                value={getScheduleTime("doors-open")}
                onChange={(event) =>
                  updateScheduleTime(
                    "doors-open",
                    "開場",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="performance-start">
                開演
              </label>

              <input
                id="performance-start"
                type="time"
                value={getScheduleTime(
                  "performance-start"
                )}
                onChange={(event) =>
                  updateScheduleTime(
                    "performance-start",
                    "開演",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="performance-end">
                終演予定
              </label>

              <input
                id="performance-end"
                type="time"
                value={getScheduleTime(
                  "performance-end"
                )}
                onChange={(event) =>
                  updateScheduleTime(
                    "performance-end",
                    "終演予定",
                    event.target.value
                  )
                }
              />
            </div>
          </>
        )}

        {hasMovie && (
          <>
            <div className="form-field">
              <label htmlFor="screening-start">
                上映開始
              </label>

              <input
                id="screening-start"
                type="time"
                value={getScheduleTime(
                  "screening-start"
                )}
                onChange={(event) =>
                  updateScheduleTime(
                    "screening-start",
                    "上映開始",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="screening-end">
                上映終了
              </label>

              <input
                id="screening-end"
                type="time"
                value={getScheduleTime(
                  "screening-end"
                )}
                onChange={(event) =>
                  updateScheduleTime(
                    "screening-end",
                    "上映終了",
                    event.target.value
                  )
                }
              />
            </div>
          </>
        )}

        {hasTalk && (
          <>
            <div className="form-field">
              <label htmlFor="talk-start">
                トーク開始
              </label>

              <input
                id="talk-start"
                type="time"
                value={getScheduleTime("talk-start")}
                onChange={(event) =>
                  updateScheduleTime(
                    "talk-start",
                    "トーク開始",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="talk-end">
                トーク終了
              </label>

              <input
                id="talk-end"
                type="time"
                value={getScheduleTime("talk-end")}
                onChange={(event) =>
                  updateScheduleTime(
                    "talk-end",
                    "トーク終了",
                    event.target.value
                  )
                }
              />
            </div>
          </>
        )}

        <div className="form-field form-field-full">
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

        <div className="form-field form-field-full">
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

        <div className="form-field form-field-full">
          <label htmlFor="event-memo">
            イベント補足
          </label>

          <textarea
            id="event-memo"
            value={memo}
            onChange={(event) =>
              setMemo(event.target.value)
            }
            placeholder="整理券、入場方法、注意事項など"
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