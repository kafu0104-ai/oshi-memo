import { useState } from 'react';
import { totals, type ShoppingMemo } from '../../services/shopping';
export default function BonusPanel({memo,buyer,onSave}:{memo:ShoppingMemo;buyer:string;onSave:(memo:ShoppingMemo)=>boolean}){
 const [editing,setEditing]=useState(false);
 const [threshold,setThreshold]=useState('');
 const [rows,setRows]=useState<{name:string;original:number}[]>([]);
 const configured=memo.bonusThreshold>0;
 const all=buyer==='all';
 const buyers=memo.buyers.filter(b=>all||b.id===buyer);
 const available=totals(memo,all?undefined:buyer).bonus;
 const quantities=memo.bonusLabels.map((_,i)=>buyers.reduce((sum,b)=>sum+(memo.bonuses[b.id]?.[i]||0),0));
 const allocated=quantities.reduce((a,b)=>a+b,0);
 function edit(){setThreshold(String(memo.bonusThreshold||3000));setRows(memo.bonusLabels.map((name,original)=>({name,original})));setEditing(true);}
 function change(i:number,value:number){const next=[...(memo.bonuses[buyer]||[])];next[i]=Math.max(0,Math.min(9999,Math.floor(value)||0));onSave({...memo,bonuses:{...memo.bonuses,[buyer]:next}});}
 return <section className="shopping-panel bonus-panel"><div className="shopping-buyer-heading"><h2>特典の希望内訳</h2><button type="button" className="buyer-edit-link" onClick={edit}>{configured?'編集':'＋ 登録'}</button></div>
 {editing&&<form className="bonus-editor" onSubmit={e=>{e.preventDefault();const labels=rows.map(r=>r.name.trim());if(labels.some(n=>!n)||new Set(labels).size!==labels.length)return;const bonuses=Object.fromEntries(Object.entries(memo.bonuses).map(([id,values])=>[id,rows.map(r=>r.original<0?0:values[r.original]||0)]));if(onSave({...memo,bonusThreshold:Number(threshold),bonusLabels:labels,bonuses}))setEditing(false);}}>
 <label>何円ごとに1枚<input type="number" className="money-input" inputMode="numeric" min="1" step="1" required value={threshold} onChange={e=>setThreshold(e.target.value)}/></label>
 {rows.map((row,i)=><div className="bonus-editor-row" key={i}><label>特典名 {i+1}<input required value={row.name} onChange={e=>setRows(rows.map((r,j)=>j===i?{...r,name:e.target.value}:r))}/></label><button type="button" className="secondary-button" disabled={rows.length===1} onClick={()=>{if(row.original>=0&&Object.values(memo.bonuses).some(values=>values[row.original]>0)&&!window.confirm('この特典の振り分け枚数も削除しますか？'))return;setRows(rows.filter((_,j)=>j!==i));}}>削除</button></div>)}
 {new Set(rows.map(r=>r.name.trim())).size!==rows.length&&<p role="alert">特典名は重複しないように入力してください。</p>}
 <button type="button" className="secondary-button" onClick={()=>setRows([...rows,{name:'',original:-1}])}>＋ 特典を追加</button>
 <div className="shopping-actions"><button type="submit">保存</button><button type="button" className="secondary-button" onClick={()=>setEditing(false)}>キャンセル</button></div>
 </form>}
 {!configured&&!editing&&<p className="shopping-note">購入特典を登録すると、必要な枚数と希望の内訳を確認できます。</p>}
 {configured&&<><p className="shopping-note">{memo.bonusThreshold.toLocaleString()}円ごとに1枚{all?' ／ 全員分の合計':''}</p>
 {memo.bonusLabels.map((label,i)=><div className="bonus-allocation-row" key={i}><span>{label}</span>{all?<strong>{quantities[i]}枚</strong>:<div className="shopping-quantity"><button type="button" aria-label={`${label}を減らす`} disabled={!quantities[i]} onClick={()=>change(i,quantities[i]-1)}>−</button><input aria-label={`${label}の希望枚数`} type="number" min="0" max="9999" value={quantities[i]} onChange={e=>change(i,Number(e.target.value))}/><button type="button" aria-label={`${label}を増やす`} disabled={quantities[i]>=9999} onClick={()=>change(i,quantities[i]+1)}>＋</button></div>}</div>)}
 <p className={`bonus-balance ${allocated>available?'is-over':''}`} role="status">特典{available}枚 ／ 振り分け{allocated}枚　{allocated>available?`${allocated-available}枚オーバー`:allocated<available?`あと${available-allocated}枚で一致`:'✓ 一致'}</p>
 {all&&<p className="shopping-note">枚数の変更は各購入者タブで行えます。特典枚数は全員分をまとめて会計した場合の目安です。</p>}
 </>}
 </section>;
}
