import { useEffect, useRef, useState } from 'react';
import { extractTicketReceptions, type ReceptionCandidate } from '../../services/ticketImport';

export default function TicketReceptionImport({sourceUrl,onApply}:{sourceUrl?:string;onApply:(candidate:ReceptionCandidate,source:string)=>void}) {
  const [url,setUrl]=useState(sourceUrl||'');
  const [items,setItems]=useState<ReceptionCandidate[]>([]);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [source,setSource]=useState('');
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function read(){
    try{const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error();}catch{setMessage('https:// で始まる公式URLを入力してください。');return;}
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const timer=window.setTimeout(()=>controller.abort(),45000);
    setBusy(true);setMessage('');setItems([]);
    try{
      const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('URLを読み込めませんでした。下のフォームから手入力できます。');
      const data=await response.json();if(!response.ok)throw new Error(data.error||'読み込めませんでした。');
      const found=extractTicketReceptions(data.html);setItems(found);setSource(url);
      setMessage(found.length?`${found.length}件の受付が見つかりました。利用する受付を選んでください。`:'受付情報を読み取れませんでした。下のフォームで入力できます。');
    }catch(e){if(request.current===controller)setMessage(controller.signal.aborted?'読み込みが時間内に完了しませんでした。もう一度お試しください。':e instanceof Error?e.message:'読み込めませんでした。');}
    finally{window.clearTimeout(timer);if(request.current===controller)setBusy(false);}
  }
  const date=(d?:string,t?:string)=>d?`${d.replaceAll('-','/')} ${t||''}`:'未定';
  return <section className="ticket-reception-import">
    <h3>公式URLから受付情報を読み込む</h3>
    {sourceUrl&&<p>イベントに登録した公式URLを引き継いでいます。</p>}
    <label className="form-field">受付情報のある公式URL<input type="url" value={url} disabled={busy} placeholder="https://…" onChange={e=>{setUrl(e.target.value);setItems([]);setMessage('');}}/></label>
    <button type="button" disabled={busy||!url.trim()} onClick={read}>{busy?'読み込み中…':'受付候補を読み込む'}</button>
    <p role="status">{message}</p>
    {!!items.length&&<><p>反映すると受付名・購入方法・日程を置き換えます。券種・枚数・同行者などの入力は残ります。</p><a href={source} target="_blank" rel="noopener noreferrer">公式ページを確認</a></>}
    {items.map((item,index)=><article className="ticket-import-candidate" key={index}>
      <p>{item.mode}</p><h4>{item.name}</h4>
      <p>{item.receptionType==='lottery'?'申込期間':'販売期間'}：{date(item.applicationStartDate,item.applicationStartTime)}{item.applicationDeadlineDate?` 〜 ${date(item.applicationDeadlineDate,item.applicationDeadlineTime)}`:'〜（終了未定）'}</p>
      {item.resultDate&&<p>当落発表：{date(item.resultDate,item.resultTime)}</p>}
      {item.note&&<p className="ticket-import-note">{item.note}</p>}
      <button type="button" onClick={()=>{onApply(item,source);setItems([]);setMessage(`${item.mode}「${item.name}」を下のフォームに反映しました。確認して登録してください。`);}}>この受付を反映</button>
    </article>)}
    <p>読み込まず、そのまま手入力することもできます。</p>
  </section>;
}
