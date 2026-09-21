import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  Event,
  EventPerformance,
  EventScheduleItem,
} from "../../types/Event";

import { DEFAULT_EVENT_TAGS } from "../../types/EventTag";

interface EventFormProps {
  onSaveEvent: (event: Event) => void;
  onCancel: () => void;
  editingEvent?: Event | null;
}

function createPerformance(): EventPerformance {
  return {
    id: crypto.randomUUID(),
    date: "",
    name: "",
    schedule: [],
    memo: "",
  };
}

function EventForm({
  onSaveEvent,
  onCancel,
  editingEvent = null,
}: EventFormProps) {
  const [title, setTitle] = useState("");

  const [
    selectedTagIds,
    setSelectedTagIds,
  ] = useState<string[]>([]);

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [venue, setVenue] =
    useState("");

  const [
    officialUrl,
    setOfficialUrl,
  ] = useState("");

  const [memo, setMemo] =
    useState("");

  const [
    performances,
    setPerformances,
  ] = useState<EventPerformance[]>([]);

  const isEditing =
    Boolean(editingEvent);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);

      setSelectedTagIds(
        editingEvent.tagIds ?? []
      );

      setStartDate(
        editingEvent.startDate
      );

      setEndDate(
        editingEvent.endDate
      );

      setVenue(
        editingEvent.venue
      );

      setOfficialUrl(
        editingEvent.officialUrl ?? ""
      );

      setMemo(
        editingEvent.memo ?? ""
      );

      setPerformances(
        editingEvent.performances ?? []
      );
    } else {
      setTitle("");
      setSelectedTagIds([]);
      setStartDate("");
      setEndDate("");
      setVenue("");
      setOfficialUrl("");
      setMemo("");
      setPerformances([]);
    }
  }, [editingEvent]);

  const handleToggleTag = (
    tagId: string
  ) => {
    setSelectedTagIds(
      (currentTagIds) => {
        if (
          currentTagIds.includes(tagId)
        ) {
          return currentTagIds.filter(
            (currentTagId) =>
              currentTagId !== tagId
          );
        }

        return [
          ...currentTagIds,
          tagId,
        ];
      }
    );
  };

  const hasLiveOrStage =
    selectedTagIds.includes("live") ||
    selectedTagIds.includes("stage");

  const hasMovie =
    selectedTagIds.includes("movie");

  const hasTalk =
    selectedTagIds.includes("talk");

  const hasPerformanceTag =
    hasLiveOrStage ||
    hasMovie ||
    hasTalk;

  const handleAddPerformance = () => {
    setPerformances(
      (currentPerformances) => [
        ...currentPerformances,
        createPerformance(),
      ]
    );
  };

  const handleDeletePerformance = (
    performanceId: string
  ) => {
    setPerformances(
      (currentPerformances) =>
        currentPerformances.filter(
          (performance) =>
            performance.id !==
            performanceId
        )
    );
  };

  const updatePerformance = (
    performanceId: string,
    changes: Partial<EventPerformance>
  ) => {
    setPerformances(
      (currentPerformances) =>
        currentPerformances.map(
          (performance) =>
            performance.id ===
            performanceId
              ? {
                  ...performance,
                  ...changes,
                }
              : performance
        )
    );
  };

  const updatePerformanceSchedule = (
    performanceId: string,
    scheduleId: string,
    type: EventScheduleItem["type"],
    label: string,
    time: string
  ) => {
    setPerformances(
      (currentPerformances) =>
        currentPerformances.map(
          (performance) => {
            if (
              performance.id !==
              performanceId
            ) {
              return performance;
            }

            const existingItem =
              performance.schedule.find(
                (item) =>
                  item.id ===
                  scheduleId
              );

            let nextSchedule:
              EventScheduleItem[];

            if (existingItem) {
              nextSchedule =
                performance.schedule.map(
                  (item) =>
                    item.id ===
                    scheduleId
                      ? {
                          ...item,
                          type,
                          label,
                          time,
                        }
                      : item
                );
            } else {
              nextSchedule = [
                ...performance.schedule,
                {
                  id: scheduleId,
                  type,
                  label,
                  time,
                },
              ];
            }

            return {
              ...performance,
              schedule: nextSchedule,
            };
          }
        )
    );
  };

  const getPerformanceScheduleTime = (
    performance: EventPerformance,
    scheduleId: string
  ) => {
    return (
      performance.schedule.find(
        (item) =>
          item.id === scheduleId
      )?.time ?? ""
    );
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      alert(
        "イベント名を入力してください。"
      );
      return;
    }

    const cleanedPerformances =
      performances
        .map((performance) => ({
          ...performance,

          name:
            performance.name?.trim() ||
            undefined,

          memo:
            performance.memo?.trim() ||
            undefined,

          schedule:
            performance.schedule.filter(
              (item) =>
                item.time.trim() !== ""
            ),
        }))
        .filter(
          (performance) =>
            performance.date !== "" ||
            Boolean(
              performance.name
            ) ||
            performance.schedule.length >
              0 ||
            Boolean(
              performance.memo
            )
        );

    const savedEvent: Event = {
      id:
        editingEvent?.id ??
        crypto.randomUUID(),

      title: trimmedTitle,

      tagIds:
        selectedTagIds,

      startDate,

      endDate,

      schedule:
        editingEvent?.schedule ?? [],

      performances:
        cleanedPerformances,

      venue:
        venue.trim(),

      officialUrl:
        officialUrl.trim() ||
        undefined,

      memo:
        memo.trim() ||
        undefined,
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
            {isEditing
              ? "EDIT EVENT"
              : "NEW EVENT"}
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
              setTitle(
                event.target.value
              )
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
            {DEFAULT_EVENT_TAGS.map(
              (tag) => {
                const isSelected =
                  selectedTagIds.includes(
                    tag.id
                  );

                return (
                  <button
                    key={tag.id}
                    className={
                      isSelected
                        ? "event-tag-button is-selected"
                        : "event-tag-button"
                    }
                    type="button"
                    aria-pressed={
                      isSelected
                    }
                    onClick={() =>
                      handleToggleTag(
                        tag.id
                      )
                    }
                  >
                    {isSelected && (
                      <span
                        aria-hidden="true"
                      >
                        ✓{" "}
                      </span>
                    )}

                    {tag.name}
                  </button>
                );
              }
            )}
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
              setStartDate(
                event.target.value
              )
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
              setEndDate(
                event.target.value
              )
            }
          />
        </div>

        {hasPerformanceTag && (
          <div className="event-performance-field form-field-full">
            <div className="event-performance-heading">
              <div>
                <span className="event-tag-label">
                  公演回・参加予定
                </span>

                <p className="event-tag-description">
                  昼夜公演・複数日・上映回など、
                  管理したい回だけ追加できます
                </p>
              </div>

              <button
                className="secondary-button event-performance-add-button"
                type="button"
                onClick={
                  handleAddPerformance
                }
              >
                ＋ 公演回を追加
              </button>
            </div>

            {performances.length ===
              0 && (
              <div className="event-performance-empty">
                <p>
                  公演回はまだ登録されていません。
                </p>

                <p>
                  1公演だけの場合も、
                  必要なときだけ追加できます。
                </p>
              </div>
            )}

            <div className="event-performance-list">
              {performances.map(
                (
                  performance,
                  index
                ) => (
                  <div
                    className="event-performance-card"
                    key={
                      performance.id
                    }
                  >
                    <div className="event-performance-card-header">
                      <strong>
                        公演回{" "}
                        {index + 1}
                      </strong>

                      <button
                        className="event-performance-delete-button"
                        type="button"
                        onClick={() =>
                          handleDeletePerformance(
                            performance.id
                          )
                        }
                      >
                        削除
                      </button>
                    </div>

                    <div className="event-performance-grid">
                      <div className="form-field">
                        <label
                          htmlFor={`performance-date-${performance.id}`}
                        >
                          公演日
                        </label>

                        <input
                          id={`performance-date-${performance.id}`}
                          type="date"
                          value={
                            performance.date
                          }
                          onChange={(
                            event
                          ) =>
                            updatePerformance(
                              performance.id,
                              {
                                date:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                        />
                      </div>

                      <div className="form-field">
                        <label
                          htmlFor={`performance-name-${performance.id}`}
                        >
                          公演回名
                        </label>

                        <input
                          id={`performance-name-${performance.id}`}
                          type="text"
                          value={
                            performance.name ??
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updatePerformance(
                              performance.id,
                              {
                                name:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          placeholder="例：昼公演、ソワレ、第2部"
                        />
                      </div>

                      {hasLiveOrStage && (
                        <>
                          <div className="form-field">
                            <label
                              htmlFor={`doors-open-${performance.id}`}
                            >
                              開場
                            </label>

                            <input
                              id={`doors-open-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "doors-open"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "doors-open",
                                  "doorsOpen",
                                  "開場",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label
                              htmlFor={`performance-start-${performance.id}`}
                            >
                              開演
                            </label>

                            <input
                              id={`performance-start-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "performance-start"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "performance-start",
                                  "start",
                                  "開演",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label
                              htmlFor={`performance-end-${performance.id}`}
                            >
                              終演予定
                            </label>

                            <input
                              id={`performance-end-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "performance-end"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "performance-end",
                                  "expectedEnd",
                                  "終演予定",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {hasMovie && (
                        <>
                          <div className="form-field">
                            <label
                              htmlFor={`screening-start-${performance.id}`}
                            >
                              上映開始
                            </label>

                            <input
                              id={`screening-start-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "screening-start"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "screening-start",
                                  "screeningStart",
                                  "上映開始",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label
                              htmlFor={`screening-end-${performance.id}`}
                            >
                              上映終了
                            </label>

                            <input
                              id={`screening-end-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "screening-end"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "screening-end",
                                  "screeningEnd",
                                  "上映終了",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {hasTalk && (
                        <>
                          <div className="form-field">
                            <label
                              htmlFor={`talk-start-${performance.id}`}
                            >
                              トーク開始
                            </label>

                            <input
                              id={`talk-start-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "talk-start"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "talk-start",
                                  "talkStart",
                                  "トーク開始",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label
                              htmlFor={`talk-end-${performance.id}`}
                            >
                              トーク終了
                            </label>

                            <input
                              id={`talk-end-${performance.id}`}
                              type="time"
                              step={300}
                              value={getPerformanceScheduleTime(
                                performance,
                                "talk-end"
                              )}
                              onChange={(
                                event
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "talk-end",
                                  "talkEnd",
                                  "トーク終了",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      <div className="form-field form-field-full">
                        <label
                          htmlFor={`performance-memo-${performance.id}`}
                        >
                          公演回メモ
                        </label>

                        <input
                          id={`performance-memo-${performance.id}`}
                          type="text"
                          value={
                            performance.memo ??
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updatePerformance(
                              performance.id,
                              {
                                memo:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          placeholder="例：アフタートークあり、千秋楽"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {performances.length >
              0 && (
              <button
                className="secondary-button event-performance-add-button-bottom"
                type="button"
                onClick={
                  handleAddPerformance
                }
              >
                ＋ 公演回を追加
              </button>
            )}
          </div>
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
              setVenue(
                event.target.value
              )
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
              setOfficialUrl(
                event.target.value
              )
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
              setMemo(
                event.target.value
              )
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