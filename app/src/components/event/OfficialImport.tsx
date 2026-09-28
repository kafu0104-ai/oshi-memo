import { useState } from 'react';
import { extractOfficialFields, extractOfficialLotteries, type ImportedLottery, type OfficialFields } from '../../services/officialImport';
const labels:Record<keyof OfficialFields,string>={title:'イベント名',startDate:'開催開始日',endDate:'開催終了日',venue:'会場・店舗',openingTime:'営業開始時刻',closingTime:'営業終了時刻'};
export default function OfficialImport({url,onUrlChange,current,onApply}:{url:string;onUrlChange:(url:string)=>void;current:OfficialFields;onApply:(fields:OfficialFields,rounds:ImportedLottery[])=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [candidates,setCandidates]=useState<OfficialFields|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [rounds,setRounds]=useState<ImportedLottery[]>([]);
  const [chosenRounds,setChosenRounds]=useState<number[]>([]);
  const [source,setSource]=useState('');
  async function read(){
    setError('');setCandidates(null);setRounds([]);setChosenRounds([]);
    try {if(new URL(url).protocol!=='https:')throw new Error();}catch{setError('https:// で始まる公式ページのURLを入力してください。');return;}
    setBusy(true);
    try{
      const response=await fetch('/api/official-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:AbortSignal.timeout(45000)});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('この公開環境ではURL読み込みがまだ利用できません。手入力で登録できます。');
      const data=await response.json();if(!response.ok)throw new Error(data.error || '読み込めませんでした。');
      const lottery=extractOfficialLotteries(data.html);setRounds(lottery);
      const fields=extractOfficialFields(data.html);setCandidates(fields);setSource(data.url);
      setSelected(Object.keys(fields).filter(key=>!current[key as keyof OfficialFields]));
      if(!Object.keys(fields).length&&!lottery.length)setError('基本情報が見つかりませんでした。画像のみの告知などは手入力してください。');
    }catch(e){setError(e instanceof Error?e.message:'読み込めませんでした。');}finally{setBusy(false);}
  }
  return <section className="form-field-full official-import">
    <label className="form-field" htmlFor="event-official-url"><span>公式サイトURL（任意）</span><input id="event-official-url" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={url} placeholder="https://…" disabled={busy} onChange={e=>{onUrlChange(e.target.value);setCandidates(null);setError('');}}/></label>
    <button type="button" disabled={busy||!url.trim()} onClick={read}>{busy?'読み込み中…':'読み込む'}</button>
    <p>URLがない場合は、そのまま手入力できます。</p>
    {error&&<p role="alert">{error}</p>}
    {candidates&&(Object.keys(candidates).length>0||rounds.length>0)&&<div className="official-import-review">
      <h3>読み取った内容を確認</h3><p>反映する項目にチェックしてください。入力済みの項目は未選択です。</p>
      <a href={source} target="_blank" rel="noopener noreferrer">読み取り元を確認</a>
      {Object.entries(candidates).map(([key,value])=><label key={key} className="official-import-item"><input type="checkbox" checked={selected.includes(key)} onChange={e=>setSelected(previous=>e.target.checked?[...previous,key]:previous.filter(item=>item!==key))}/><span><strong>{labels[key as keyof OfficialFields]}</strong><span>{value}</span>{current[key as keyof OfficialFields]&&<small>現在：{current[key as keyof OfficialFields]}</small>}</span></label>)}
      {rounds.length>0&&<><h3>事前抽選の候補</h3><p>追加したい回を選んでください。時刻の記載がないものは日付だけ取り込みます。</p>{rounds.map((round,index)=><label className="official-import-item" key={index}><input type="checkbox" checked={chosenRounds.includes(index)} onChange={e=>setChosenRounds(current=>e.target.checked?[...current,index]:current.filter(i=>i!==index))}/><span><strong>{round.name}</strong><span>対象：{round.startDate} 〜 {round.endDate}</span><span>応募：{round.applicationStart} 〜 {round.applicationEnd}</span><span>当落：{round.resultDate}</span></span></label>)}</>}
      <button type="button" disabled={!selected.length&&!chosenRounds.length} onClick={()=>{onApply(Object.fromEntries(Object.entries(candidates).filter(([key])=>selected.includes(key))),rounds.filter((_,i)=>chosenRounds.includes(i)));setCandidates(null);setError('');}}>選んだ項目を反映</button>
      <p>読み取れなかった項目は、下のフォームで入力してください。</p>
    </div>}
  </section>;
}
