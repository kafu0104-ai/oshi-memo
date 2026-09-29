import type { AttendanceEntry, EntryPeriod } from "../../types/Event";
import TimeSelect from "../common/TimeSelect";
import { generateId } from "../../services/id";

export default function EntryPeriods({value,onChange,ticketMode=false}:{ticketMode?:boolean;value:EntryPeriod[];onChange:(value:EntryPeriod[])=>void}) {
  const update=(id:string,patch:Partial<EntryPeriod>)=>onChange(value.map(period=>period.id===id?{...period,...patch}:period));
  return <section className="form-field-full genre-modules entry-methods">
    <h3>入場方法・申込日時</h3>{ticketMode&&<p>わかる項目だけ入力できます。保存するとチケット情報に引き継がれます。当落・支払いはチケット情報で管理します。</p>}
    {value.map((period,index)=>{
      const updateEntry=(id:string,patch:Partial<AttendanceEntry>)=>update(period.id,{entries:period.entries.map(entry=>entry.id===id?{...entry,...patch}:entry)});
      return <section className="entry-round" key={period.id}>
          <label className="form-field"><span>入場方法</span><select value={period.method} onChange={e=>update(period.id,{method:e.target.value,...(e.target.value === "抽選" && period.method !== "抽選" ? {entries:period.entries.map(entry=>({...entry,result:"結果待ち" as const}))} : {})})}><option value="">まだ不明</option>{[...new Set([...(ticketMode?["抽選","先着・予約","当日購入","チケット不要"]:["自由入場","整理券","予約","抽選"]),...(period.method?[period.method]:[])])].map(method=><option key={method}>{method}</option>)}</select></label>
        {(period.method === "自由入場" || period.method === "チケット不要") && (period.entries.length ? period.entries : [{id:`${period.id}-visit`,date:"",time:"",result:"結果待ち" as const}]).map(entry=><div className="genre-fields" key={entry.id}>
          <label className="form-field"><span>参加・来場予定日</span><input type="date" value={entry.date} onChange={e=>period.entries.length ? updateEntry(entry.id,{date:e.target.value}) : update(period.id,{entries:[{...entry,date:e.target.value}]})}/></label>
          <label className="form-field"><span>入場予定時刻</span><input type="time" value={entry.time} onChange={e=>period.entries.length ? updateEntry(entry.id,{time:e.target.value}) : update(period.id,{entries:[{...entry,time:e.target.value}]})}/></label>
        </div>)}
        {period.method === "整理券" && <div className="genre-fields">
          <label className="form-field"><span>整理番号</span><input type="text" value={period.queueNumber ?? ""} placeholder="例：A-123" onChange={e=>update(period.id,{queueNumber:e.target.value})}/></label>
          <label className="form-field"><span>入場予定時刻</span><input type="time" value={period.queueEntryTime ?? period.entries[0]?.time ?? ""} onChange={e=>update(period.id,{queueEntryTime:e.target.value})}/></label>
          <label className="form-field"><span>集合時間</span><input type="time" value={period.queueMeetingTime ?? ""} onChange={e=>update(period.id,{queueMeetingTime:e.target.value})}/></label>
        </div>}
        {period.method && period.method !== "自由入場" && period.method !== "整理券" && period.method !== "チケット不要" && !(ticketMode && ["先着・予約", "当日購入"].includes(period.method)) && <section className="ticket-options">
        {period.method === "抽選" && <h4>{period.name || `抽選回 ${index+1}`}</h4>}
        {period.method === "抽選" && <label className="form-field"><span>抽選回の名前（任意）</span><input value={period.name ?? ""} placeholder="例：第2弾" onChange={e=>update(period.id,{name:e.target.value})}/></label>}
        {period.method === "抽選" && period.startDate && <p>抽選対象：{period.startDate} 〜 {period.endDate}</p>}
        <div className="genre-fields">
          {period.method === "抽選" && <>
            <label className="form-field"><span>抽選申込開始日時</span><input type={period.applicationStart?.length === 10 ? "date" : "datetime-local"} value={period.applicationStart ?? ""} onChange={e=>update(period.id,{applicationStart:e.target.value})}/></label>
            <label className="form-field"><span>抽選申込締切日時</span><input type={period.applicationEnd?.length === 10 ? "date" : "datetime-local"} min={period.applicationStart || undefined} value={period.applicationEnd ?? ""} onChange={e=>update(period.id,{applicationEnd:e.target.value})}/></label>
            <label className="form-field"><span>当落発表日</span><input type="date" value={period.resultDate} onChange={e=>update(period.id,{resultDate:e.target.value})}/></label>
            <label className="form-field"><span>当落発表時刻</span><input type="time" value={period.resultTime} onChange={e=>update(period.id,{resultTime:e.target.value})}/></label>
            {ticketMode&&<label className="form-field"><span>支払期限（任意）</span><input type="date" value={period.paymentDeadline??""} onChange={e=>update(period.id,{paymentDeadline:e.target.value})}/></label>}
          </>}
        </div>
        {!ticketMode&&period.method === "抽選" && <p>当選した時刻だけチェック。結果を確定すると、残りは落選になります。</p>}
        {!ticketMode&&[...new Set(period.entries.map(entry=>entry.date))].map(date=>{
          const entries=period.entries.filter(entry=>entry.date===date);
          return <details className="ticket-options entry-day" key={date} open>
            <summary>{date ? date.replaceAll("-","/") : "日付を選択"}（{entries.length}枠）</summary>
            <label className="form-field"><span>参加・来場する日</span><input type="date" value={date} onChange={e=>update(period.id,{entries:period.entries.map(entry=>entry.date===date?{...entry,date:e.target.value}:entry)})}/></label>
            {entries.map(entry=><div className="entry-time-row" key={entry.id}>
              <div className="form-field"><span>入場予定時刻</span>{period.method === "抽選" ? <TimeSelect id={`entry-${entry.id}`} value={entry.time} disabled={entry.result === "落選"} onChange={time=>updateEntry(entry.id,{time})}/> : <input aria-label="入場予定時刻" type="time" value={entry.time} onChange={e=>updateEntry(entry.id,{time:e.target.value})}/>}</div>
              {period.method === "抽選" && <label className="entry-winner"><input type="checkbox" checked={entry.result === "当選"} onChange={e=>updateEntry(entry.id,{result:e.target.checked?"当選":"結果待ち"})}/>当選{entry.result === "落選" && <span>（落選）</span>}</label>}
              <button type="button" className="secondary-button" onClick={()=>update(period.id,{entries:period.entries.filter(item=>item.id!==entry.id)})}>削除</button>
            </div>)}
            <button type="button" className="secondary-button" onClick={()=>update(period.id,{entries:[...period.entries,{id:generateId(),date,time:"",result:"結果待ち"}]})}>＋ 時刻を追加</button>
          </details>;
        })}
        {!ticketMode&&period.method === "抽選" && period.entries.length > 0 && <>
          <button type="button" className="secondary-button" onClick={()=>update(period.id,{entries:period.entries.map(entry=>({...entry,result:entry.result === "当選" ? "当選" : "落選"}))})}>当落結果を確定</button>
          <p>最後にイベントを保存すると、当落結果も保存されます。</p>
        </>}
        <div className="genre-fields">
          {!ticketMode&&<button type="button" className="secondary-button" onClick={()=>update(period.id,{entries:[...period.entries,{id:generateId(),date:"",time:"",result:"結果待ち"}]})}>＋ 日付を追加</button>}
          <button type="button" className="secondary-button" onClick={()=>onChange(value.filter(item=>item.id!==period.id))}>この回を削除</button>
        </div>
        </section>}
      </section>;
    })}
    {(value.length === 0 || value.some(period=>period.method)) && <button type="button" className="secondary-button" onClick={()=>onChange([...value,{id:generateId(),startDate:"",endDate:"",method:"",resultDate:"",resultTime:"",entries:[]}])}>＋ 入場方法・抽選回を追加</button>}
  </section>;
}
