import type { Event } from "../../types/Event";
import { fieldsForTags, genreFields, extraModules } from "../../services/eventGenres";
export default function GenreSummary({event}: {event:Event}) {
  const fields = [...new Map([...fieldsForTags(event.tagIds ?? []), ...Object.values(genreFields).flat(),{key:"openingHours",label:"営業時間の補足"},{key:"screeningEnd",label:"上映終了予定"},{key:"entryResultDate",label:"当落発表日"},{key:"entryResultTime",label:"当落発表時刻"},{key:"entryResult",label:"当落ステータス"}].map(f=>[f.key,f])).values()];
  const periods = event.entryPeriods;
  const entries = event.genreDetails?.entryMethod === "抽選" && event.tagIds?.includes("goods-sale") ? event.attendanceEntries : undefined;
  return <section className="event-memo-section">
    {!periods && !entries && event.attendanceDate && <p><strong>自分の参加予定：</strong>{event.attendanceDate.replaceAll("-","/")} {event.attendanceTime}</p>}
    {!periods && !entries && !event.attendanceDate && event.attendanceTime && <p>参加予定時刻：{event.attendanceTime}（日付未定）</p>}
    {!periods && entries?.map((entry,index)=><p key={entry.id} style={{opacity:entry.result === "落選" ? .45 : 1}}>参加候補 {index+1}：{entry.date || "日付未定"} {entry.time}（{entry.result}）</p>)}
    {periods?.map((period,i)=><section className="ticket-options" key={period.id}><h3>{period.method === "整理券" ? "整理券" : `${period.name || `入場方法・抽選回 ${i+1}`}：${period.method || "方法未定"}`}</h3>{period.method === "抽選" && (period.applicationStart || period.applicationEnd) && <p>抽選申込：{period.applicationStart?.replace("T"," ") || "開始未定"} 〜 {period.applicationEnd?.replace("T"," ") || "締切未定"}</p>}{period.method === "抽選" && <p>当落発表：{period.resultDate || "未定"} {period.resultTime}</p>}{period.method === "抽選" && period.paymentDeadline && <p>支払期限：{period.paymentDeadline}</p>}{period.method === "整理券" && <dl className="genre-summary"><div><dt>整理番号</dt><dd>{period.queueNumber || "未入力"}</dd></div><div><dt>入場予定時刻</dt><dd>{period.queueEntryTime ?? period.entries[0]?.time ?? "未定"}</dd></div><div><dt>集合時間</dt><dd>{period.queueMeetingTime || "未定"}</dd></div></dl>}{period.method !== "整理券" && period.entries.map((entry,index)=><p key={entry.id} style={{opacity:period.method === "抽選" && entry.result === "落選" ? .45 : 1}}>参加日時 {index+1}：{entry.date || "日付未定"} {entry.time}{period.method === "抽選" ? `（${entry.result}）` : ""}</p>)}</section>)}
    <dl className="genre-summary">{fields.filter(f=>event.genreDetails?.[f.key] && !(periods && f.key.startsWith("entry")) && !(entries && f.key === "entryResult")).map(f=><div key={f.key}><dt>{f.label}</dt><dd>{event.genreDetails?.[f.key]}</dd></div>)}</dl>
    {Object.entries(event.extraModules ?? {}).map(([key,values])=>extraModules[key] && <section className="ticket-options" key={key}><h3>{extraModules[key].label}</h3><dl className="genre-summary">{extraModules[key].fields.filter(f=>values[f.key]).map(f=><div key={f.key}><dt>{f.label}</dt><dd>{values[f.key]}</dd></div>)}</dl></section>)}
  </section>;
}
