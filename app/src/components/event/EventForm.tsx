import { OshiIcon } from "../common/OshiIcon";
import { genreIcons, mainGenre, initialEntryPeriods } from "../../services/eventGenres";
import OfficialImport from "./OfficialImport";
import EntryPeriods from "./EntryPeriods";
import GenreFields, { ExtraModules } from "./GenreFields";
import VenueMapLink from "../common/VenueMapLink";
import { generateId } from "../../services/id";
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
import TimeSelect from "../common/TimeSelect";

interface EventFormProps {
  onSaveEvent: (event: Event) => void;
  onCancel: () => void;
  editingEvent?: Event | null;
}

function createPerformance(): EventPerformance {
  return {
    id: generateId(),
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
  const [genre, setGenre] = useState(() => mainGenre(editingEvent));
  const [choosingGenre, setChoosingGenre] = useState(!editingEvent);
  const [attendanceDate, setAttendanceDate] = useState(editingEvent?.attendanceDate ?? "");
  const [attendanceTime, setAttendanceTime] = useState(editingEvent?.attendanceTime ?? "");
  const [details, setDetails] = useState(editingEvent?.genreDetails ?? {});
  const [modules, setModules] = useState(editingEvent?.extraModules ?? {});
  const [entryPeriods, setEntryPeriods] = useState(() => initialEntryPeriods(editingEvent));
  const [saveError, setSaveError] = useState("");
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
        Array.from(new Set([mainGenre(editingEvent), ...(editingEvent.tagIds ?? [])].filter(Boolean)))
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

    if (genre !== "movie" && startDate && endDate && startDate > endDate) { setSaveError("終了日は開始日以降に設定してください。"); return; }
    if (selectedTags.includes("goods-sale") && entryPeriods.some(period=>period.method === "抽選" && period.applicationStart && period.applicationEnd && period.applicationStart > period.applicationEnd)) { setSaveError("抽選申込締切は開始日時以降に設定してください。"); return; }
    const savedEvent: Event = {
      ...editingEvent,
      mainGenreId: genre || undefined,
      attendanceDate: attendanceDate || undefined,
      attendanceTime: attendanceTime || undefined,
      entryPeriods: selectedTags.includes("goods-sale") || editingEvent?.entryPeriods ? entryPeriods : undefined,
      genreDetails: details,
      extraModules: modules,
      id:
        editingEvent?.id ??
        generateId(),

      title: trimmedTitle,

      tagIds:
        selectedTagIds,

      startDate,

      endDate,

      /**
       * 旧イベントのscheduleは
       * 互換性のため保持する。
       */
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

    try { onSaveEvent(savedEvent); } catch { setSaveError("保存できませんでした。入力内容は残っています。もう一度お試しください。"); }
  };

  if (choosingGenre || !genre) return <section className="event-form-section genre-choice">
    <h2>どんなイベントを登録しますか？</h2><p>メインジャンルを選んでください。ほかのタグは次の画面で追加できます。</p>
    <div className="genre-grid">{DEFAULT_EVENT_TAGS.map(tag=><button type="button" className="genre-tile" key={tag.id} onClick={()=>{
      setSelectedTagIds(current=>Array.from(new Set([tag.id,...current.filter(id=>id !== genre)])));
      setGenre(tag.id); setChoosingGenre(false);
    }}><OshiIcon name={genreIcons[tag.id]} size={40}/><strong>{tag.name}</strong></button>)}</div>
    <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
  </section>;
  const selectedTags = Array.from(new Set([genre,...selectedTagIds]));
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

      <form className="event-registration-form" onSubmit={handleSubmit}>
        <div className="form-field-full genre-selected"><OshiIcon name={genreIcons[genre]} size={32}/><strong>{DEFAULT_EVENT_TAGS.find(tag=>tag.id === genre)?.name}</strong>{!isEditing && <button type="button" className="secondary-button" onClick={()=>setChoosingGenre(true)}>選び直す</button>}<p>メインジャンルは保存後に変更できません。</p></div>
        <OfficialImport url={officialUrl} onUrlChange={setOfficialUrl} current={{title,startDate,endDate,venue,openingTime:details.openingTime,closingTime:details.closingTime}} onApply={(fields,rounds)=>{
          if(rounds.length){
            setSelectedTagIds(current=>current.includes("goods-sale")?current:[...current,"goods-sale"]);
            setEntryPeriods(current=>{const next=[...current];for(const round of rounds){if(!next.some(item=>item.method === "抽選" && item.name === round.name && item.applicationStart === round.applicationStart && item.applicationEnd === round.applicationEnd && item.resultDate === round.resultDate))next.push({...round,id:generateId(),method:"抽選",resultTime:"",entries:[]});}return next.filter(item=>item.method || item.entries.some(entry=>entry.date||entry.time));});
          }
          if(fields.title)setTitle(fields.title);
          if(fields.startDate)setStartDate(fields.startDate);
          if(fields.endDate)setEndDate(fields.endDate);
          if(fields.venue)setVenue(fields.venue);
          setDetails(previous=>({...previous,...(fields.openingTime?{openingTime:fields.openingTime}:{}),...(fields.closingTime?{closingTime:fields.closingTime}:{})}));
        }}/>
        <div className="form-field form-field-full">
          <label htmlFor="event-title">
            {genre === "movie" || genre === "stage" ? "作品名" : "イベント名"} *
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
            placeholder={genre === "movie" || genre === "stage" ? "作品名を入力" : "イベント名を入力"}
            required
          />
        </div>

        <div className="event-tag-field form-field-full">
          <div>
            <span className="event-tag-label">
              イベントタグ
            </span>

            <p className="event-tag-description">
              メインジャンルは選択済みです。追加タグを選ぶと入力項目と追加機能が増えます
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
                    disabled={tag.id === genre}
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

                    {tag.name}{tag.id === genre ? "（メイン）" : ""}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {genre !== "movie" && <div className="form-field">
          <label htmlFor="event-start-date">
            {genre === "online-sale" ? "販売・受注開始日" : "開催開始日"}
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
        </div>}

        {genre !== "movie" && <div className="form-field">
          <label htmlFor="event-end-date">
            {genre === "online-sale" ? "販売・受注締切日" : "開催終了日"}
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
        </div>}

        {genre !== "online-sale" && !selectedTags.includes("goods-sale") && <fieldset className="form-field-full genre-fields attendance-fields">
          <label className="form-field"><span>{genre === "movie" ? "鑑賞日" : "自分が参加・来場する日"}</span><input type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)}/></label>
          <label className="form-field"><span>{genre === "movie" ? "上映開始" : "参加・入場予定時刻"}</span><input type="time" value={attendanceTime} onChange={e=>setAttendanceTime(e.target.value)}/></label>
          {genre === "movie" && <label className="form-field"><span>上映終了予定</span><input type="time" value={details.screeningEnd ?? ""} onChange={e=>setDetails({...details,screeningEnd:e.target.value})}/></label>}
        </fieldset>}
        {hasPerformanceTag && (
          <div className="event-performance-field form-field-full">
            <div className="event-performance-heading">
              <div>
                <span className="event-tag-label">
                  公演スケジュール
                </span>

                <p className="event-tag-description">
                  昼夜公演・複数日・上映回など、
                  チケット申込や予定管理に使う公演回を追加できます
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
                  公演スケジュールはまだ登録されていません。
                </p>

                <p>
                  必要な公演回だけ追加できます。
                  全公演を登録してもOKです。
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
                            <label>
                              開場
                            </label>

                            <TimeSelect
                              id={`doors-open-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "doors-open"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "doors-open",
                                  "doorsOpen",
                                  "開場",
                                  value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label>
                              開演
                            </label>

                            <TimeSelect
                              id={`performance-start-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "performance-start"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "performance-start",
                                  "start",
                                  "開演",
                                  value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label>
                              終演予定
                            </label>

                            <TimeSelect
                              id={`performance-end-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "performance-end"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "performance-end",
                                  "expectedEnd",
                                  "終演予定",
                                  value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {hasMovie && (
                        <>
                          <div className="form-field">
                            <label>
                              上映開始
                            </label>

                            <TimeSelect
                              id={`screening-start-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "screening-start"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "screening-start",
                                  "screeningStart",
                                  "上映開始",
                                  value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label>
                              上映終了
                            </label>

                            <TimeSelect
                              id={`screening-end-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "screening-end"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "screening-end",
                                  "screeningEnd",
                                  "上映終了",
                                  value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {hasTalk && (
                        <>
                          <div className="form-field">
                            <label>
                              トーク開始
                            </label>

                            <TimeSelect
                              id={`talk-start-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "talk-start"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "talk-start",
                                  "talkStart",
                                  "トーク開始",
                                  value
                                )
                              }
                            />
                          </div>

                          <div className="form-field">
                            <label>
                              トーク終了
                            </label>

                            <TimeSelect
                              id={`talk-end-${performance.id}`}
                              value={getPerformanceScheduleTime(
                                performance,
                                "talk-end"
                              )}
                              onChange={(
                                value
                              ) =>
                                updatePerformanceSchedule(
                                  performance.id,
                                  "talk-end",
                                  "talkEnd",
                                  "トーク終了",
                                  value
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
            {genre === "online-sale" ? "ショップ名" : genre === "movie" ? "映画館・会場" : genre === "stage" ? "劇場" : "会場・店舗"}
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
          {genre !== "online-sale" && <VenueMapLink venue={venue} />}
        </div>

        <GenreFields tags={selectedTags} details={details} onChange={setDetails}/>

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

        {selectedTags.includes("goods-sale") && <EntryPeriods value={entryPeriods} onChange={setEntryPeriods}/>}
        <ExtraModules tags={selectedTags} value={modules} onChange={setModules} lottery={details.saleType === "抽選"}/>
        <p className="form-field-full">{selectedTags.some(tag=>["goods-sale","online-sale","collaboration-food"].includes(tag)) ? "保存後に買い物メモを追加できます。" : ""} {selectedTags.some(tag=>["live","stage","movie","talk","exhibition"].includes(tag)) ? "保存後にチケット情報を追加できます。" : ""}</p>
        {saveError && <p className="form-field-full" role="alert">{saveError}</p>}
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