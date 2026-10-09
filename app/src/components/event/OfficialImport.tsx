import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router';
import {extractGoods} from '../../services/goodsImport';
import {type OfficialFields,type ImportedLottery,type ImportedPerformance} from '../../services/officialImport';
import {fieldLabels,type Field,type OfficialReport} from '../../services/officialCandidates';
import {OfficialDiscovery} from '../../services/officialDiscovery';
import {applySelection,chooseFields,emptySelection,retainApplied,scheduleFields,type ImportSelection} from '../../services/officialSelection';
import OfficialSourceSummary,{importStatusLabels} from './OfficialSourceSummary';
export default function OfficialImport({url,onUrlChange,current,onApply,quick=false,onBusyChange,onReport,initialReport,allowLotteries=false}:{allowLotteries?:boolean;quick?:boolean;onBusyChange?:(busy:boolean)=>void;url:string;onUrlChange:(url:string)=>void;current:OfficialFields;onApply:(fields:OfficialFields,rounds:ImportedLottery[],performances?:ImportedPerformance[],report?:OfficialReport)=>void;onReport?:(report:OfficialReport)=>void;initialReport?:OfficialReport}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[report,setReport]=useState<OfficialReport>();
 const [selection,setSelection]=useState<ImportSelection>(emptySelection),[focus,setFocus]=useState<Field|'all'|'tickets'>('all');
 const [productCount,setProductCount]=useState(0);
 const session=useRef<OfficialDiscovery|null>(null),request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function read(reset=false){
  try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error();}catch{setMessage('公開されている https:// の公式URLを入力してください。');return;}
  if(busy)return;request.current?.abort();const controller=new AbortController();request.current=controller;
  if(reset||!session.current||session.current.input!==url){session.current=new OfficialDiscovery(url);setSelection(emptySelection());}
  setBusy(true);onBusyChange?.(true);setMessage('関連ページを確認しています。最大8ページまで読み取ります。');
  try{
   const next=retainApplied(report||initialReport,await session.current.search(reset?'all':focus,controller.signal));if(controller.signal.aborted)return;
   setReport(next);onReport?.(next);
   const page=session.current.primary;if(page)setProductCount(extractGoods(page.html,page.url).products.filter(p=>p.releaseDate||p.releaseMonth).length);
   setMessage(next.candidates.length?'候補を確認して選んでください。入力済みの内容は、選択して反映するまで変更しません。':'候補を取得できませんでした。理由を確認するか、そのまま手入力できます。');
  }catch(e){if(!controller.signal.aborted)setMessage(e instanceof Error?e.message:'読み込めませんでした。手入力できます。');}
  finally{if(request.current===controller){setBusy(false);onBusyChange?.(false);}}
 }
 const hasSelection=Object.keys(selection.fields).length+selection.shows.length+selection.rounds.length>0;
 return <section className="form-field-full official-import">
 <label className="form-field" htmlFor="event-official-url"><span>{quick?'公式URLを貼り付け（任意）':'公式サイトURL（任意）'}</span><input id="event-official-url" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={url} disabled={busy} placeholder="https://…" onChange={e=>{request.current?.abort();session.current=null;onUrlChange(e.target.value);setReport(undefined);setSelection(emptySelection());setProductCount(0);setMessage('');}}/></label>
 <button type="button" disabled={busy||!url.trim()} onClick={()=>void read(true)}>{busy?'読み込み中…':'読み込む'}</button><p>URLがなくても、そのまま手入力できます。</p><p role="status">{message}</p>
 {!quick&&productCount>0&&<p>商品・発売日の候補が{productCount}件あります。<Link to={`/shopping/new?source=${encodeURIComponent(url)}`}>買い物メモで確認</Link></p>}
 {report&&<div className="official-import-review"><h3>公式情報の読み取り結果</h3>
 <dl className="official-status-list">{Object.entries(report.fields).map(([k,v])=><div key={k}><dt>{fieldLabels[k as Field]}</dt><dd>{importStatusLabels[v.status]}{v.reason&&<small>{v.reason}</small>}</dd></div>)}</dl>
 <label className="form-field">追加で探す項目<select value={focus} disabled={busy} onChange={e=>setFocus(e.target.value as typeof focus)}><option value="all">不足している基本情報</option>{Object.entries(fieldLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}<option value="tickets">申込・抽選情報</option></select></label>
 <button type="button" disabled={busy||!session.current?.remaining} onClick={()=>void read()}>未取得の関連ページを探す</button><p>確認済みのURLは再取得しません（残り最大{session.current?.remaining??0}ページ）。関連ページがなければ探索を終了します。</p>
 {report.candidates.map(c=>{const schedule=scheduleFields.filter(k=>c.fields[k]);const groupChecked=schedule.length>0&&schedule.every(k=>selection.fields[k]===c.id);
 const toggle=(keys:Field[],checked:boolean)=>setSelection(previous=>chooseFields(previous,report,c.id,keys,checked));
 return <article key={c.id} className="official-candidate"><h4>{c.label}</h4>{c.confirmation&&<p className="official-confirmation">{c.confirmation}</p>}
 {c.notices&&<div><p>開催時刻とは別の情報です。チケットなどの管理データは自動作成しません。</p>{c.notices.map((n,i)=><p key={i}>{n.label}：{n.value}<br/>{n.excerpt}<br/><a href={n.sourceUrl} target="_blank" rel="noopener noreferrer">出典を確認</a></p>)}</div>}
 {c.unresolved&&<p>{Object.values(c.unresolved).join(' ／ ')} <a href={c.sourceUrl||report.requestedUrl} target="_blank" rel="noopener noreferrer">原文を確認</a></p>}
 {c.performance&&<label className="official-import-item"><input type="checkbox" disabled={busy} checked={selection.shows.includes(c.id)} onChange={e=>{const checked=e.target.checked;setSelection(previous=>{const fields={...previous.fields};for(const k of scheduleFields)delete fields[k];return {...previous,fields,shows:checked?[...previous.shows,c.id]:previous.shows.filter(id=>id!==c.id)};});}}/><span>この公演を追加する（日付・会場・時刻をセットで保持）</span></label>}
 {schedule.length>0&&<label className="official-import-item"><input type="checkbox" disabled={busy} checked={groupChecked} onChange={e=>toggle(schedule,e.target.checked)}/><span>この候補の日程・会場・時刻を基本情報に使う</span></label>}
 {Object.entries(c.fields).filter(([,v])=>v).map(([key,value])=>{const k=key as Field;return <div className="official-field-candidate" key={key}>{!scheduleFields.includes(k)&&<label><input type="checkbox" disabled={busy} checked={selection.fields[k]===c.id} onChange={e=>toggle([k],e.target.checked)}/> {fieldLabels[k]}を反映</label>}<p><strong>{fieldLabels[k]}：</strong>{value}</p>{current[k]&&current[k]!==value&&<p className="official-confirmation">現在の入力：{current[k]}（選択して反映すると変更されます）</p>}<details><summary>出典・根拠</summary><a href={c.evidence[k]?.sourceUrl} target="_blank" rel="noopener noreferrer">掲載ページを確認</a><p>{c.evidence[k]?.excerpt}</p><small>{c.evidence[k]?.method} ／ {c.evidence[k]?.fetchedAt}</small></details></div>})}
 {c.detailUrl&&<p><a href={c.detailUrl} target="_blank" rel="noopener noreferrer">イベント詳細URL</a></p>}
 {c.lotteries.length>0&&!allowLotteries&&<p>事前抽選を登録する場合は、詳細登録の物販ジャンルから反映してください。ここでは候補と出典を保持します。</p>}
 {c.lotteries.map((round,i)=><label key={i} className="official-import-item"><input type="checkbox" disabled={busy||!allowLotteries} checked={selection.rounds.includes(`${c.id}:${i}`)} onChange={e=>{const id=`${c.id}:${i}`;setSelection(prev=>({...prev,rounds:e.target.checked?[...prev.rounds,id]:prev.rounds.filter(x=>x!==id)}));}}/><span>{round.name}<br/>対象：{round.startDate}～{round.endDate}<br/>応募：{round.applicationStart}～{round.applicationEnd}<br/>当落：{round.resultDate}</span></label>)}
 </article>})}
 <button type="button" disabled={busy||!hasSelection} onClick={()=>{const applied=applySelection(report,selection);onApply(applied.fields,applied.rounds,applied.shows,applied.report);onReport?.(applied.report);setReport(applied.report);setSelection(emptySelection());setMessage('選んだ情報を反映しました。内容を確認してイベントを保存してください。');}}>選択した情報を反映</button>
 <OfficialSourceSummary report={report}/><p>PDF・画像内の文字、未対応の動的表示は手入力してください。</p></div>}
 {!report&&<OfficialSourceSummary report={initialReport}/>}
 </section>;
}
