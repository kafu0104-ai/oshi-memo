import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { loadEvents,loadTickets } from '../../services/storage';
import { loadExchanges } from '../../services/exchanges';
import { localToday } from '../../services/ticketTasks';
import { calendarPlans,loadCalendar,saveCalendar,textOnColor,type CalendarSettings } from '../../services/calendar';
const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export default function HomeCalendar(){
 const [expanded,setExpanded]=useState(false);
 const today=localToday();const [selected,setSelected]=useState(today),[month,setMonth]=useState(today.slice(0,7));
 const [initial]=useState(()=>{try{return {settings:loadCalendar(),plans:calendarPlans(loadEvents(),loadTickets(),loadExchanges()),error:''};}catch{return {settings:null,plans:[],error:'カレンダーを読み込めませんでした。保存データを確認してください。'};}});
 const [settings,setSettings]=useState<CalendarSettings|null>(initial.settings),[error,setError]=useState(initial.error);
 if(!settings)return <section className="home-calendar"><h2>カレンダー</h2><p role="alert">{error}</p></section>;
 const first=new Date(`${month}-01T12:00:00`),length=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 const labelFor=(id:string,kind:string)=>settings.labels.find(l=>l.id===(settings.assignments[id]??kind));
 function move(amount:number){const date=new Date(first);date.setMonth(date.getMonth()+amount);setMonth(iso(date).slice(0,7));setSelected(iso(date));}
 return <section className="home-calendar" style={{'--calendar-weight':settings.weight} as CSSProperties} aria-label="予定カレンダー">
  <div className="calendar-heading"><h2><button type="button" className="calendar-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'▾':'▸'} カレンダー</button></h2><Link className="task-navigation-button" to="/settings/calendar">色・文字の設定</Link></div>
  {!expanded&&<p className="calendar-collapsed">今日の予定：{initial.plans.filter(p=>p.date===today).length}件</p>}
  {expanded&&<>
  <div className="calendar-heading"><button type="button" aria-label="前の月" onClick={()=>move(-1)}>‹</button><h3 aria-live="polite">{first.getFullYear()}年{first.getMonth()+1}月</h3><button type="button" aria-label="次の月" onClick={()=>move(1)}>›</button><button type="button" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>今日</button></div>
  <div className="calendar-grid">{['日','月','火','水','木','金','土'].map(d=><span className="calendar-weekday" key={d}>{d}</span>)}{Array.from({length:first.getDay()},(_,i)=><span key={`blank${i}`}/>)}{Array.from({length},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`,items=initial.plans.filter(p=>p.date===date);return <button className="calendar-day" type="button" key={date} aria-pressed={selected===date} aria-current={today===date?'date':undefined} aria-label={`${date}、予定${items.length}件`} onClick={()=>setSelected(date)}><span>{i+1}</span><span className="calendar-dots">{items.slice(0,3).map(p=><i key={p.id} style={{background:labelFor(p.id,p.kind)?.color||'#ddd'}}/>)}{items.length>3&&<small>+</small>}</span></button>;})}</div>
  <div className="calendar-legend">{settings.labels.map(l=><span key={l.id} title={l.description}><i style={{background:l.color}}/>{l.name}</span>)}</div>
  <h3>{selected.replaceAll('-','/')}の予定</h3>
  {!initial.plans.some(p=>p.date===selected)&&<p>この日の予定はありません。</p>}
  {initial.plans.filter(p=>p.date===selected).map(p=>{const label=labelFor(p.id,p.kind);return <article className="calendar-plan" key={p.id}><Link className="task-navigation-button" to={p.href}>{p.time&&`${p.time} `}{p.title}</Link>{label&&<span className="calendar-badge" style={{background:label.color,color:textOnColor(label.color)}}>{label.name}</span>}<label>色分け<select value={label?.id||''} onChange={e=>{const next={...settings,assignments:{...settings.assignments,[p.id]:e.target.value}};try{saveCalendar(next);setSettings(next);setError('');}catch{setError('色分けを保存できませんでした。');}}}><option value="">色分けなし</option>{settings.labels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label></article>;})}
  </>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
