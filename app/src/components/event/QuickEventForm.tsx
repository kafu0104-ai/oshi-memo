import type { OfficialReport } from '../../services/officialCandidates';
import { useState, type FormEvent } from "react";
import type { Event } from "../../types/Event";
import type { ImportedPerformance, OfficialFields } from "../../services/officialImport";
import { generateId } from "../../services/id";
import OfficialImport from "./OfficialImport";

export default function QuickEventForm({ onSaveEvent, onCancel }: {
  onSaveEvent: (event: Event) => void;
  onCancel: () => void;
}) {
  const [officialImport,setOfficialImport]=useState<OfficialReport>();
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState<OfficialFields>({});
  const [performances, setPerformances] = useState<ImportedPerformance[]>([]);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!fields.title?.trim()) { setError("イベント名を入力してください。"); return; }
    if (!performances.length && fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
      setError("終了日は開始日以降に設定してください。"); return;
    }
    const schedule = [
      ...(fields.doorsOpen ? [{ id: generateId(), type: "doorsOpen" as const, label: "開場", time: fields.doorsOpen }] : []),
      ...(fields.endTime ? [{ id: generateId(), type: "expectedEnd" as const, label: "終了", time: fields.endTime }] : []),
      ...(fields.startTime ? [{ id: generateId(), type: "start" as const, label: "開演", time: fields.startTime }] : []),
    ];
    const genres=[...new Set(performances.map(p=>p.genre).filter(Boolean))];
    const importedGenre=genres.length===1?genres[0]:undefined;
    try {
      onSaveEvent({ officialImport, id: generateId(), title: fields.title.trim(), startDate: performances.length ? performances.map(p=>p.date).sort()[0] : fields.startDate || "",
        endDate: performances.length ? performances.map(p=>p.date).sort().at(-1)! : fields.endDate || "", venue: performances.length ? [...new Set(performances.map(p=>p.venue))].join(" ／ ") : fields.venue || "", officialUrl: url.trim() || undefined,
        attendanceDate: attendanceDate || undefined, schedule,
        ...(performances.length ? {mainGenreId:importedGenre,tagIds:importedGenre?[importedGenre]:undefined,liveFormat:new Set(performances.map(p=>p.venue)).size>1 ? "tour" as const : "single" as const,
          performances:performances.map(p=>({id:generateId(),date:p.date,venue:p.venue,schedule:[
            ...(p.doorsOpen?[{id:generateId(),type:"doorsOpen" as const,label:"開場",time:p.doorsOpen}]:[]),
            ...(p.startTime?[{id:generateId(),type:"start" as const,label:"開演",time:p.startTime}]:[]),...(p.endTime?[{id:generateId(),type:"expectedEnd" as const,label:"終了",time:p.endTime}]:[])
          ]}))} : {}),
        genreDetails: Object.fromEntries(["openingTime", "closingTime", "lastAdmission", "performers"].flatMap(key => {
          const value = fields[key as keyof OfficialFields]; return value ? [[key, value]] : [];
        })) });
    } catch { setError("保存できませんでした。入力内容は残っています。もう一度お試しください。"); }
  }
  return <section className="event-form-section quick-event-form">
    <p>名前だけでも登録できます。詳しい設定はあとからで大丈夫です。</p>
    <form onSubmit={submit}>
      <OfficialImport initialReport={officialImport} onReport={setOfficialImport} quick onBusyChange={setBusy} url={url} onUrlChange={setUrl} current={fields}
        onApply={(values, _rounds, shows) => { setFields(current => ({ ...current, ...values })); if(shows?.length)setPerformances(previous=>[...previous,...shows.filter(show=>!previous.some(p=>p.date===show.date&&p.venue===show.venue&&p.startTime===show.startTime))]); }} />
      <label className="form-field">イベント名（必須）<input required value={fields.title || ""} placeholder="例：ライブ名、展示会名" onChange={e => setFields({ ...fields, title: e.target.value })} /></label>
      {performances.length>0 && <section className="quick-imported-shows"><h3>登録する公演（{performances.length}件）</h3><p>日付・会場・時刻はここで修正できます。</p>{performances.map((p,index)=><fieldset key={index}><legend>公演 {index+1}</legend><label className="form-field">公演日<input type="date" required value={p.date} onChange={e=>setPerformances(items=>items.map((item,i)=>i===index?{...item,date:e.target.value}:item))}/></label><label className="form-field">会場<input value={p.venue} onChange={e=>setPerformances(items=>items.map((item,i)=>i===index?{...item,venue:e.target.value}:item))}/></label><div className="quick-event-dates">{(['doorsOpen','startTime'] as const).map(key=><label className="form-field" key={key}>{key==='doorsOpen'?'開場':'開演'}<input type="time" value={p[key]||''} onChange={e=>setPerformances(items=>items.map((item,i)=>i===index?{...item,[key]:e.target.value}:item))}/></label>)}</div><button type="button" className="secondary-button" onClick={()=>{setPerformances(items=>items.filter((_,i)=>i!==index));if(performances.length===1)setFields(current=>({title:current.title,performers:current.performers}));}}>この公演を外す</button></fieldset>)}</section>}
      {!performances.length && <><div className="quick-event-dates">
        <label className="form-field">開催日（任意）<input type="date" value={fields.startDate || ""} onChange={e => setFields({ ...fields, startDate: e.target.value })} /></label>
        <label className="form-field">終了日（複数日開催の場合）<input type="date" min={fields.startDate} value={fields.endDate || ""} onChange={e => setFields({ ...fields, endDate: e.target.value })} /></label>
      </div>
      <p className="quick-event-hint">日程未定・あとで設定したい場合は、空欄で登録できます。</p>
      <details><summary>自分が参加する日を入れる（任意）</summary><label className="form-field">参加日<input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} /></label></details>
      {fields.venue && <label className="form-field">読み取った会場<input value={fields.venue} onChange={e => setFields({ ...fields, venue: e.target.value })} /></label>}
      {([['doorsOpen', '読み取った開場時刻'], ['startTime', '読み取った開演時刻'], ['endTime', '読み取った終了時刻'], ['openingTime', '読み取った営業開始時刻'], ['closingTime', '読み取った営業終了時刻'], ['lastAdmission', '読み取った最終入場時刻']] as const).map(([key, label]) => fields[key] !== undefined && <label className="form-field" key={key}>{label}<input type="time" value={fields[key] || ""} onChange={e => setFields({ ...fields, [key]: e.target.value })} /></label>)}
      </>}
      {fields.performers !== undefined && <details><summary>読み取った出演者を確認・修正</summary><label className="form-field">出演者<textarea rows={7} value={fields.performers} onChange={e=>setFields({...fields,performers:e.target.value})}/></label></details>}
      {error && <p role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button><button type="submit" disabled={busy}>イベントを登録</button></div>
    </form>
  </section>;
}
