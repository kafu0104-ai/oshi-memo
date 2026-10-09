import { useEffect, useRef, useState } from 'react';
import { extractTicketReceptions, extractTicketSeats, type SeatGroup, type SeatCandidate, type ReceptionCandidate } from '../../services/ticketImport';

export default function TicketReceptionImport({sourceUrl,onApply,onSeats}:{sourceUrl?:string;onSeats:(seats:SeatCandidate[],group:string)=>void;onApply:(candidate:ReceptionCandidate,source:string)=>void}) {
  const [url,setUrl]=useState(sourceUrl||'');
  const [items,setItems]=useState<ReceptionCandidate[]>([]);
  const [groups,setGroups]=useState<SeatGroup[]>([]);
  const [groupIndex,setGroupIndex]=useState('');
  const [selected,setSelected]=useState<number[]>([]);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [source,setSource]=useState('');
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function read(){
    try{const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error();}catch{setMessage('https:// で始まる公式URLを入力してください。');return;}
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const timer=window.setTimeout(()=>controller.abort(),45000);
    setBusy(true);setMessage('');setItems([]);setGroups([]);setGroupIndex('');setSelected([]);
    try{
      const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('URLを読み込めませんでした。下のフォームから手入力できます。');
      const data=await response.json();if(!response.ok)throw new Error(data.error||'読み込めませんでした。');
      const found=extractTicketReceptions(data.html);setItems(found);setGroups(extractTicketSeats(data.html));setSource(url);
      setMessage(found.length?`${found.length}件の受付が見つかりました。利用する受付を選んでください。`:'受付情報を読み取れませんでした。下のフォームで入力できます。');
    }catch(e){if(request.current===controller)setMessage(controller.signal.aborted?'読み込みが時間内に完了しませんでした。もう一度お試しください。':e instanceof Error?e.message:'読み込めませんでした。');}
    finally{window.clearTimeout(timer);if(request.current===controller)setBusy(false);}
  }
  const date=(d?:string,t?:string)=>d?`${d.replaceAll('-','/')} ${t||''}`:'未定';
  return <section className="ticket-reception-import">
    <h3>公式URLから受付・席種を読み込む</h3>
    {sourceUrl&&<p>イベントに登録した公式URLを引き継いでいます。</p>}
    <label className="form-field">受付情報のある公式URL<input type="url" value={url} disabled={busy} placeholder="https://…" onChange={e=>{setUrl(e.target.value);setItems([]);setGroups([]);setGroupIndex('');setSelected([]);setMessage('');}}/></label>
    <button type="button" disabled={busy||!url.trim()} onClick={read}>{busy?'読み込み中…':'受付・席種を読み込む'}</button>
    <p role="status">{message}</p>
    {!!items.length&&<><p>反映すると受付名・購入方法・日程を置き換えます。券種・枚数・同行者などの入力は残ります。</p><a href={source} target="_blank" rel="noopener noreferrer">公式ページを確認</a></>}
    {items.map((item,index)=><article className="ticket-import-candidate" key={index}>
      <p>{item.mode}</p><h4>{item.name}</h4>
      <p>{item.receptionType==='lottery'?'申込期間':'販売期間'}：{date(item.applicationStartDate,item.applicationStartTime)}{item.applicationDeadlineDate?` 〜 ${date(item.applicationDeadlineDate,item.applicationDeadlineTime)}`:'〜（終了未定）'}</p>
      {item.resultDate&&<p>当落発表：{date(item.resultDate,item.resultTime)}</p>}
      {item.note&&<p className="ticket-import-note">{item.note}</p>}
      <button type="button" onClick={()=>{onApply(item,source);setItems([]);setMessage(`${item.mode}「${item.name}」を下のフォームに反映しました。確認して登録してください。`);}}>この受付を反映</button>
    </article>)}
    {!!groups.length&&<section className="ticket-import-candidate">
      <h4>席種・料金を追加</h4>
      <label className="form-field">公演・会場<select value={groupIndex} onChange={e=>{setGroupIndex(e.target.value);setSelected([]);}}><option value="">選んでください</option>{groups.map((g,i)=><option value={i} key={i}>{g.label}</option>)}</select></label>
      {groupIndex!==''&&groups[Number(groupIndex)].seats.map((seat,i)=><label key={i} style={{display:'flex',alignItems:'center',gap:12,margin:'12px 0'}}><input type="checkbox" style={{width:22,height:22,flexShrink:0}} checked={selected.includes(i)} onChange={e=>setSelected(current=>e.target.checked?[...current,i]:current.filter(n=>n!==i))}/><span>{seat.name}：{seat.price.toLocaleString('ja-JP')}円</span></label>)}
      <p>申し込む席種を選んでください。入力済みの席種は残ります。</p>
      <button type="button" disabled={!selected.length} onClick={()=>{const group=groups[Number(groupIndex)];onSeats(selected.map(i=>group.seats[i]),group.label);setSelected([]);setMessage('選んだ席種・料金を追加しました。下のフォームで枚数を入力できます。');}}>選んだ席種を追加</button>
    </section>}
    <p>読み込まず、そのまま手入力することもできます。</p>
  </section>;
}
