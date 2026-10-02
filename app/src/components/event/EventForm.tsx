import { normalizeSchedule, scheduleTime, setScheduleTime } from "../../services/performanceSchedule";
import { supportsInlineTicket, type EntryTicketDraft, type EventTicketChanges } from "../../services/eventTicketDraft";
import { loadTickets } from "../../services/storage";
import AutoTextarea from "../common/AutoTextarea";
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
  onSaveEvent: (event: Event, tickets?: EventTicketChanges) => void;
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
  const [liveFormat, setLiveFormat] = useState<"single" | "tour">(editingEvent?.liveFormat ?? "single");
  const [genre, setGenre] = useState(() => mainGenre(editingEvent));
  const [choosingGenre, setChoosingGenre] = useState(!editingEvent);
  const [attendanceDate, setAttendanceDate] = useState(editingEvent?.attendanceDate ?? "");
  const [attendanceTime, setAttendanceTime] = useState(editingEvent?.attendanceTime ?? "");
  const [details, setDetails] = useState(editingEvent?.genreDetails ?? {});
  const [modules, setModules] = useState(editingEvent?.extraModules ?? {});
  const [entryPeriods, setEntryPeriods] = useState(() => initialEntryPeriods(editingEvent).map(period=>{
    const r=loadTickets().find(t=>t.eventId===editingEvent?.id)?.receptions.find(r=>r.sourceEntryPeriodId===period.id);
    if(!r || r.applications.length!==1 || r.seatTypes.length>1)return period;
    const a=r.applications[0];
    return {...period,ticketPrice:r.seatTypes[0]?.price,ticketQuantity:a.quantity,ticketPurchased:a.status==='won',ticketStatus:a.status,ticketPayerId:a.fulfillment?.payment.payerId||'self'};
  }));
  const [ticketDrafts, setTicketDrafts] = useState<Record<string,EntryTicketDraft>>({});
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
      setLiveFormat(editingEvent.liveFormat ?? "single");

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
      setLiveFormat("single");
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
        {...createPerformance(),date:currentPerformances.length===0?startDate:"",venue:liveFormat==="tour" && currentPerformances.length===0?venue:undefined},
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

            return {...performance,schedule:setScheduleTime(performance.schedule,scheduleId,type,label,time)};
          }
        )
    );
  };

  const getPerformanceScheduleTime = (
    performance: EventPerformance,
    scheduleId: string
  ) => {
    return scheduleTime(performance.schedule,scheduleId);
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

          venue: performance.venue?.trim() || undefined,
          name:
            performance.name?.trim() ||
            undefined,

          memo:
            performance.memo?.trim() ||
            undefined,

          schedule:
            normalizeSchedule(performance.schedule).filter(
              (item) =>
                item.time.trim() !== ""
            ),
        }))
        .filter(
          (performance) =>
            performance.date !== "" || Boolean(performance.venue) ||
            Boolean(
              performance.name
            ) ||
            performance.schedule.length >
              0 ||
            Boolean(
              performance.memo
            )
        );

    if (genre !== "movie" && genre!=="live" && startDate && endDate && startDate > endDate) { setSaveError("終了日は開始日以降に設定してください。"); return; }
    if (selectedTags.some(tag=>["goods-sale","live","stage","talk","exhibition","collaboration-food","movie"].includes(tag)) && entryPeriods.some(period=>!ticketDrafts[period.id] && period.method === "抽選" && period.applicationStart && period.applicationEnd && period.applicationStart > period.applicationEnd)) { setSaveError("抽選申込締切は開始日時以降に設定してください。"); return; }
    if(entryPeriods.some(p=>(p.ticketPrice!==undefined&&(!Number.isFinite(p.ticketPrice)||p.ticketPrice<0))||(p.ticketQuantity!==undefined&&(!Number.isInteger(p.ticketQuantity)||p.ticketQuantity<1)))){setSaveError("料金は0円以上、枚数は1枚以上の整数で入力してください。");return;}
    if(entryPeriods.some(p=>!ticketDrafts[p.id]&&p.applicationStart&&p.applicationEnd&&p.applicationStart>p.applicationEnd)){setSaveError("受付締切は開始日時以降にしてください。");return;}
    const activeDrafts = genre === "goods-sale" ? [] : entryPeriods.filter(p=>supportsInlineTicket(p.method)).flatMap(p=>ticketDrafts[p.id] ? [ticketDrafts[p.id]] : []);
    const invalidTicket = activeDrafts.find(d=>d.error);
    if(invalidTicket){setSaveError(invalidTicket.error);return;}
    const savedPeriods = entryPeriods.map(p=>{
      const draft = genre!=="goods-sale" && supportsInlineTicket(p.method) ? ticketDrafts[p.id]?.reception : undefined;
      if(!draft)return p;
      const dateTime=(date?:string,time?:string)=>date ? date+(time?`T${time}`:"") : undefined;
      return {...p,resultDate:draft.resultDate??"",resultTime:draft.resultTime??"",applicationStart:dateTime(draft.applicationStartDate,draft.applicationStartTime),applicationEnd:dateTime(draft.applicationDeadlineDate,draft.applicationDeadlineTime),ticketPrice:undefined,ticketQuantity:undefined,ticketPurchased:undefined,ticketStatus:undefined,ticketPayerId:undefined,paymentDeadline:undefined};
    });
    const ticketChanges: EventTicketChanges = {receptions:activeDrafts.map(d=>({...d.reception,name:entryPeriods.find(p=>p.id===d.reception.sourceEntryPeriodId)?.name?.trim()||d.reception.name})),companions:[...new Map(activeDrafts.flatMap(d=>d.companions).map(c=>[c.id,c])).values()]};
    const performanceDates = genre==="live" ? cleanedPerformances.map(p=>p.date).filter(Boolean).sort() : [];
    const savedEvent: Event = {
      ...editingEvent,
      mainGenreId: genre || undefined,
      liveFormat: genre === "live" ? liveFormat : editingEvent?.liveFormat,
      attendanceDate: attendanceDate || undefined,
      attendanceTime: attendanceTime || undefined,
      entryPeriods: selectedTags.some(tag=>["goods-sale","live","stage","talk","exhibition","collaboration-food","movie"].includes(tag)) || editingEvent?.entryPeriods ? savedPeriods : undefined,
      genreDetails: details,
      extraModules: modules,
      id:
        editingEvent?.id ??
        generateId(),

      title: trimmedTitle,

      tagIds:
        selectedTagIds,

      startDate: performanceDates[0] || startDate,

      endDate: performanceDates.at(-1) || (genre==="live" ? (endDate && endDate>=startDate ? endDate : startDate) : endDate),

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

    try { onSaveEvent(savedEvent,ticketChanges); } catch { setSaveError("保存できませんでした。入力内容は残っています。もう一度お試しください。"); }
  };

  if (choosingGenre || !genre) return <section className="event-form-section genre-choice">
    <h2>どんなイベントを登録しますか？</h2><p>メインジャンルを選んでください。ほかのタグは次の画面で追加できます。</p>
    <div className="genre-grid">{DEFAULT_EVENT_TAGS.map(tag=><button type="button" className="genre-tile" key={tag.id} onClick={()=>{
      setSelectedTagIds(current=>Array.from(new Set([tag.id,...current.filter(id=>id !== genre)])));
      setGenre(tag.id); setChoosingGenre(false);
      if(tag.id === "live")setPerformances(current=>current.length?current:[{...createPerformance(),date:startDate}]);
    }}><OshiIcon name={genreIcons[tag.id]} size={40}/><strong>{tag.name}</strong></button>)}</div>
    <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
  </section>;
  const selectedTags = Array.from(new Set([genre,...selectedTagIds]));
  const performanceFields = hasPerformanceTag && (
          <div className="event-performance-field form-field-full">
            <div className="event-performance-heading">
              <div>
                <span className="event-tag-label">
                  公演スケジュール
                </span>

                <p className="event-tag-description">
                  {genre === "live" && liveFormat === "tour" ? "気になる公演・申し込む公演だけ追加できます。全公演の登録は不要です。" : "昼夜公演・複数日・上映回など、チケット申込や予定管理に使う公演回を追加できます"}
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
                      {(genre === "live" && liveFormat === "tour" || performance.venue) && <div className="form-field form-field-full"><label htmlFor={`performance-venue-${performance.id}`}>この公演の会場</label><input id={`performance-venue-${performance.id}`} type="text" value={performance.venue ?? ""} onChange={e=>updatePerformance(performance.id,{venue:e.target.value})} placeholder="例：横浜アリーナ"/><VenueMapLink venue={performance.venue || ""}/></div>}
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

                        <AutoTextarea
                          id={`performance-memo-${performance.id}`}
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
        );
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
        {genre === "live" && <div className="form-field-full"><span className="event-tag-label">ライブの形式</span><div className="event-tag-list" role="group" aria-label="ライブの形式">{([['single','単発'],['tour','ツアー']] as const).map(([value,label])=><button type="button" key={value} className={`event-tag-button${liveFormat===value?' is-selected':''}`} aria-pressed={liveFormat===value} onClick={()=>{
          setLiveFormat(value);
          if(value==='tour')setPerformances(current=>current.length?current.map(p=>({...p,venue:p.venue||venue})):[{...createPerformance(),date:startDate,venue,schedule:editingEvent?.schedule??[]}]);
        }}>{label}</button>)}</div></div>}
        <OfficialImport url={officialUrl} onUrlChange={setOfficialUrl} current={{title,startDate,endDate,venue,openingTime:details.openingTime,closingTime:details.closingTime,lastAdmission:details.lastAdmission,doorsOpen:performances.length===1?scheduleTime(performances[0].schedule,"doors-open"):undefined,startTime:performances.length===1?scheduleTime(performances[0].schedule,"performance-start"):undefined}} onApply={(fields,rounds)=>{
          if(rounds.length){
            setSelectedTagIds(current=>current.includes("goods-sale")?current:[...current,"goods-sale"]);
            setEntryPeriods(current=>{const next=[...current];for(const round of rounds){if(!next.some(item=>item.method === "抽選" && item.name === round.name && item.applicationStart === round.applicationStart && item.applicationEnd === round.applicationEnd && item.resultDate === round.resultDate))next.push({...round,id:generateId(),method:"抽選",resultTime:"",entries:[]});}return next.filter(item=>item.method || item.entries.some(entry=>entry.date||entry.time));});
          }
          if(fields.title)setTitle(fields.title);
          if(fields.startDate)setStartDate(fields.startDate);
          if(fields.endDate)setEndDate(fields.endDate);
          if(fields.venue)setVenue(fields.venue);
          if(fields.doorsOpen||fields.startTime||(genre==="live"&&liveFormat==="tour"&&(fields.venue||fields.startDate)))setPerformances(current=>{
            const target=current.length===1?current[0]:createPerformance();
            let schedule=[...target.schedule];
            for(const [type,label,time] of [["doorsOpen","開場",fields.doorsOpen],["start","開演",fields.startTime]] as const){
              if(!time)continue;
              schedule=setScheduleTime(schedule,type==="doorsOpen"?"doors-open":"performance-start",type,label,time);
            }
            const updated={...target,date:fields.startDate||target.date||startDate,venue:genre==="live"&&liveFormat==="tour"?(fields.venue||target.venue||venue):target.venue,schedule};
            return current.length===1?[updated]:[...current,updated];
          });
          setDetails(previous=>({...previous,...(fields.openingTime?{openingTime:fields.openingTime}:{}),...(fields.closingTime?{closingTime:fields.closingTime}:{}),...(fields.lastAdmission?{lastAdmission:fields.lastAdmission}:{})}));
        }}/>
        <div className="form-field form-field-full">
          <label htmlFor="event-title">
            {genre === "live" ? (liveFormat === "tour" ? "ツアー名" : "公演名") : genre === "movie" || genre === "stage" ? "作品名" : "イベント名"} *
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
            placeholder={genre === "live" ? (liveFormat === "tour" ? "ツアー名を入力" : "公演名を入力") : genre === "movie" || genre === "stage" ? "作品名を入力" : "イベント名を入力"}
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

        {genre !== "movie" && !(genre==="live" && performances.length>0) && <div className="form-field">
          <label htmlFor="event-start-date">
            {genre === "online-sale" ? "販売・受注開始日" : genre==="live"?"公演日":"開催開始日"}
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

        {genre !== "movie" && genre !== "live" && <div className="form-field">
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

        {genre !== "online-sale" && genre !== "live" && !selectedTags.includes("goods-sale") && <fieldset className="form-field-full genre-fields attendance-fields">
          <label className="form-field"><span>{genre === "movie" ? "鑑賞日" : "自分が参加・来場する日"}</span><input type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)}/></label>
          <label className="form-field"><span>{genre === "movie" ? "上映開始" : "参加・入場予定時刻"}</span><input type="time" value={attendanceTime} onChange={e=>setAttendanceTime(e.target.value)}/></label>
          {genre === "movie" && <label className="form-field"><span>上映終了予定</span><input type="time" value={details.screeningEnd ?? ""} onChange={e=>setDetails({...details,screeningEnd:e.target.value})}/></label>}
        </fieldset>}
        {performanceFields}
        {genre==="live" && (attendanceDate||attendanceTime) && <details className="form-field-full"><summary>以前に登録した参加日時</summary><label className="form-field">参加日<input type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)}/></label><label className="form-field">参加時刻<input type="time" value={attendanceTime} onChange={e=>setAttendanceTime(e.target.value)}/></label></details>}

        {!(genre === "live" && liveFormat === "tour") && <div className="form-field form-field-full">
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
            placeholder={genre === "online-sale" ? "例：ブロッコリーオンライン" : "例：池袋・サンシャインシティ"}
          />
          {genre !== "online-sale" && <VenueMapLink venue={venue} />}
        </div>}

        <GenreFields tags={selectedTags} details={details} onChange={setDetails}/>

        <div className="form-field form-field-full">
          <label htmlFor="event-memo">
            イベント補足
          </label>

          <AutoTextarea
            id="event-memo"
            value={memo}
            onChange={(event) =>
              setMemo(
                event.target.value
              )
            }
            placeholder="整理券、入場方法、注意事項など"
            rows={2}
          />
        </div>

        {selectedTags.some(tag=>["goods-sale","live","stage","talk","exhibition","collaboration-food","movie"].includes(tag)) && <EntryPeriods performances={performances} eventTitle={title} ticketDrafts={ticketDrafts} onTicketDraftChange={(id,value)=>setTicketDrafts(current=>({...current,[id]:value}))} eventId={editingEvent?.id} ticketMode={genre !== "goods-sale"} value={entryPeriods} onChange={setEntryPeriods}/>}
        <ExtraModules hideReservation={genre!=="goods-sale"} tags={selectedTags} value={modules} onChange={setModules} lottery={details.saleType === "抽選"}/>
        <p className="form-field-full">{selectedTags.some(tag=>["goods-sale","online-sale","collaboration-food"].includes(tag)) ? "保存後に買い物メモを追加できます。" : ""} {selectedTags.some(tag=>["live","stage","movie","talk","exhibition"].includes(tag)) ? "チケット情報・同行者・精算も、イベントと一緒に保存されます。" : ""}</p>
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