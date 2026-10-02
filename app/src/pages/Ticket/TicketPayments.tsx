import type { EventPerformance } from "../../types/Event";
import { withCompanionSettlements } from "../../services/companionSettlements";
import { isLottery, receptionStatuses, removeReceptionApplication } from "../../services/ticketReception";
import { generateId } from "../../services/id";
import { TagPicker } from "../../components/common/TaskTags";
import { selectedTags } from "../../services/taskTags";
import { ticketShare, settlementAmount } from "../../services/ticketAmounts";
import { OshiIcon } from "../../components/common/OshiIcon";
import { useState } from "react";
import type { Companion } from "../../types/Companion";
import type { TicketApplication, TicketFulfillment, TicketReception } from "../../types/Ticket";
const empty = (): TicketFulfillment => ({ payment: { isPaid: false, settlements: [] }, issuance: { isIssued: false }, distributions: [], seatAssignments: [] });

export default function TicketPayments({ performances = [], reception, companions, onChange, onCompanionsChange }: {
  performances?: EventPerformance[];
  reception: TicketReception;
  companions: Companion[];
  onChange: (reception: TicketReception) => void;
  onCompanionsChange: (companions: Companion[]) => void;
}) {
  const admission = reception.receptionType === "admission";
  const lottery = isLottery(reception);
  const statuses = receptionStatuses(reception);
  const [payerEditor,setPayerEditor] = useState<{applicationId:string;companionId?:string;name:string}|null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const activeCompanions = companions.filter(c => !c.deleted);
  function update(app: TicketApplication) {
    const previous=reception.applications.find(a=>a.id===app.id);
    if(app.fulfillment?.payment.payerId==='self'&&(previous?.fulfillment?.payment.payerId!=='self'||JSON.stringify(previous?.companionIds)!==JSON.stringify(app.companionIds))){
      app=withCompanionSettlements(app,generateId);
      const f=app.fulfillment!;
      app={...app,fulfillment:{...f,payment:{...f.payment,settlements:f.payment.settlements.filter(s=>s.direction!=='receive'||s.isSettled||app.companionIds.includes(s.companionId))}}};
    }
    onChange({ ...reception, applications: reception.applications.some(a => a.id === app.id)
      ? reception.applications.map(a => a.id === app.id ? app : a) : [...reception.applications, app] });
  }
  function savePayer() {
    if(!payerEditor)return;
    const name=payerEditor.name.trim();
    if(!name){setError("支払者の名前を入力してください。");return;}
    const now=new Date().toISOString(), existing=companions.find(c=>c.id===payerEditor.companionId);
    const person=existing?{...existing,name,updatedAt:now}:{id:generateId(),name,createdAt:now,updatedAt:now};
    onCompanionsChange(existing?companions.map(c=>c.id===person.id?person:c):[...companions,person]);
    if(!existing){
      const app=reception.applications.find(a=>a.id===payerEditor.applicationId);
      if(app){const f=app.fulfillment??empty();update({...app,fulfillment:{...f,payment:{...f.payment,payerId:person.id,isPaid:false}}});}
    }
    setPayerEditor(null);setError("");setMessage(`${name}さんを${existing?"変更":"追加"}しました。最後に保存すると確定します。`);
  }
  function addCompanion() {
    if (!name.trim()) { setError("同行者の名前を入力してください。"); return; }
    const now = new Date().toISOString();
    onCompanionsChange([...companions, { id: generateId(), name: name.trim(), createdAt: now, updatedAt: now }]);
    setName(""); setError(""); setMessage(`${name.trim()}さんを追加しました。最後に保存すると確定します。`);
  }
  return <section className="ticket-options ticket-payments"><h3>支払い状況</h3>
    <p>チケット情報と一緒に保存されます。最後に保存ボタンを押してください。</p>
    {reception.applications.map((app, index) => {
      const fulfillment = app.fulfillment ?? empty();
      const payment = fulfillment.payment;
      const change = (next: typeof payment) => update({ ...app, fulfillment: { ...fulfillment, payment: next } });
      return <section className="ticket-options" id={app.id} key={app.id}><div className="ticket-payment-heading"><h4 className="icon-heading">{lottery && (app.status === "won" || app.status === "lost") && <OshiIcon name={app.status} size={28} />}{reception.seatTypes.find(seat => seat.id === app.seatTypeId)?.name || `支払い状況 ${index + 1}`}</h4><button type="button" className="secondary-button" aria-label={`支払い状況 ${index+1}を削除`} onClick={()=>{if(window.confirm("この支払い状況を削除しますか？関連する支払い・精算の記録も、最後に保存すると削除されます。"))onChange(removeReceptionApplication(reception,app.id));}}>削除</button></div>
        {performances.length > 0 && <label className="form-field">参加する公演<select value={app.performanceId ?? ""} onChange={e=>update({...app,performanceId:e.target.value || undefined})}><option value="">未選択</option>{app.performanceId && !performances.some(p=>p.id===app.performanceId) && <option value={app.performanceId}>以前選択した公演（削除済み）</option>}{performances.map((p,i)=><option key={p.id} value={p.id}>{p.date || "日付未定"} {p.name || `公演 ${i+1}`} {p.venue || ""}</option>)}</select></label>}
        <label className="form-field">{lottery ? "申込・当落状況" : "購入状況"}<select value={app.status} onChange={e => update({ ...app, status: e.target.value as TicketApplication["status"] })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {!admission && reception.seatTypes.length>1 && <label className="form-field">対象の券種<select value={app.seatTypeId ?? (reception.seatTypes.length === 1 ? reception.seatTypes[0].id : "")} onChange={e => update({ ...app, seatTypeId: e.target.value || undefined })}><option value="">券種を選択</option>{reception.seatTypes.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>}
        <label className="form-field">支払者<select value={payment.payerId ?? ""} onChange={e => {if(e.target.value==="__new__"){setPayerEditor({applicationId:app.id,name:""});return;}setPayerEditor(null);change({ ...payment, payerId: e.target.value || undefined, isPaid: false });}}><option value="">未定</option><option value="self">自分</option>{companions.filter(c => !c.deleted || payment.payerId === c.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__new__">＋ 支払者を追加</option></select></label>
        {payment.payerId && payment.payerId!=="self" && <button type="button" className="secondary-button" onClick={()=>setPayerEditor({applicationId:app.id,companionId:payment.payerId,name:companions.find(c=>c.id===payment.payerId)?.name??""})}>支払者の名前を編集</button>}
        {payerEditor?.applicationId===app.id && <div className="ticket-options">
          <label className="form-field"><span>支払者の名前</span><input value={payerEditor.name} placeholder="名前・ニックネーム" onChange={e=>setPayerEditor({...payerEditor,name:e.target.value})}/></label>
          {payerEditor.companionId&&<p>名前の変更は、この人を選んでいるほかの記録にも反映されます。</p>}
          <div className="form-actions"><button type="button" onClick={savePayer}>{payerEditor.companionId?"名前を変更":"追加して選択"}</button><button type="button" className="secondary-button" onClick={()=>setPayerEditor(null)}>キャンセル</button></div>
        </div>}
        {(!payment.payerId || payment.payerId === "self") && <TagPicker preferredIds={["application", "result", "issuance"]} value={selectedTags(payment,"payment")} onChange={tagIds => change({ ...payment, tagIds, important: tagIds.includes("important") })} />}
        <label className="form-field">支払方法<select value={payment.method ?? ""} onChange={e => change({ ...payment, method: (e.target.value || undefined) as typeof payment.method })}><option value="">未選択</option><option value="cash">現金</option><option value="convenienceStore">コンビニ払い</option><option value="bankTransfer">銀行振込</option><option value="creditCard">クレジットカード</option><option value="payPay">PayPay</option><option value="dPayment">d払い</option><option value="auPayment">auかんたん決済</option><option value="otherMethod">その他</option>{payment.method === "other" && <option value="other">コンビニ・振込など（以前の登録）</option>}</select></label>
        <label className="form-field">支払期限<input type="date" value={payment.deadlineDate ?? ""} onChange={e => change({ ...payment, deadlineDate: e.target.value || undefined })}/></label>
        <label className="ticket-check"><input type="checkbox" checked={payment.isPaid} onChange={e => change({ ...payment, isPaid: e.target.checked })}/>支払い完了</label>
      </section>;
    })}
    {<button type="button" onClick={() => update({ id: generateId(), quantity: 1, companionIds: [], status: "notApplied", fulfillment: empty() })}>＋ 支払い状況を追加</button>}
    {message && <p role="status">{message}</p>}
    {reception.applications.some(app => app.quantity > 1 && (!app.fulfillment?.payment.payerId || app.fulfillment.payment.payerId === "self")) && <section className="ticket-options"><h3>同行者</h3>
      <p>チケットを一緒に利用する人を選んでください。</p>
      {reception.applications.filter(app => app.quantity > 1 && (!app.fulfillment?.payment.payerId || app.fulfillment.payment.payerId === "self")).map(app => <fieldset key={app.id}><legend>{reception.seatTypes.find(seat => seat.id === app.seatTypeId)?.name || "チケット"}（{app.quantity}枚）</legend>
        {activeCompanions.map(c => <label className="ticket-check" key={c.id}><input type="checkbox" checked={app.companionIds.includes(c.id)} onChange={e => update({ ...app, companionIds: e.target.checked ? [...app.companionIds, c.id] : app.companionIds.filter(id => id !== c.id) })}/>{c.name}</label>)}
      </fieldset>)}
      <div className="companion-add-row"><label className="form-field">同行者を追加<input value={name} onChange={e => setName(e.target.value)} placeholder="名前・ニックネーム" /></label><button type="button" onClick={addCompanion}>追加</button></div>
    </section>}
    {error && <p role="alert">{error}</p>}

    {reception.applications.map((app) => {
      const fulfillment = app.fulfillment ?? empty(); const payment = fulfillment.payment;
      const share = ticketShare(reception, app);
      const change = (next: typeof payment) => update({ ...app, fulfillment: { ...fulfillment, payment: next } });
      return <section key={app.id}>
        {payment.payerId && (payment.payerId !== "self" || payment.settlements.length>0) && <>
        <h4>{payment.payerId === "self" ? "同行者との精算" : "支払者との精算"}</h4><p>支払者を変更しても登録済みの精算は残ります。不要になった精算は削除してください。</p><p>支払いとは別に記録します。チケット代と手数料から1人1枚分を自動計算します。必要なら手入力に変更できます。</p>
        {payment.settlements.map(settlement => <div className="ticket-options" key={settlement.id}>
          <p>{companions.find(c => c.id === settlement.companionId)?.name ?? "未登録の同行者"} {settlement.direction === "receive" ? "から受け取る" : "へ支払う"}</p>
          <label className="ticket-check"><input type="checkbox" checked={settlement.amountMode === "auto" || (settlement.amountMode === undefined && settlement.amount === 0)} disabled={settlement.isSettled} onChange={e => change({ ...payment, settlements: payment.settlements.map(s => s.id === settlement.id ? { ...s, amountMode: e.target.checked ? "auto" : "manual", amount: settlementAmount(reception, app, s) ?? s.amount } : s) })}/>チケット代・手数料から自動計算</label>
          <label className="form-field">精算金額（円）<input type="number" className="money-input" inputMode="numeric" min="0" step="1" required readOnly={settlement.isSettled || settlement.amountMode === "auto" || (settlement.amountMode === undefined && settlement.amount === 0)} value={settlementAmount(reception, app, settlement) ?? ""} onChange={e => { const value = e.target.valueAsNumber; if (!Number.isSafeInteger(value) || value < 0) return; change({ ...payment, settlements: payment.settlements.map(s => s.id === settlement.id ? { ...s, amount: value, amountMode: "manual" } : s) }); }}/></label>
          <label className="ticket-check"><input type="checkbox" checked={settlement.isSettled} disabled={settlementAmount(reception, app, settlement) === undefined} onChange={e => change({ ...payment, settlements: payment.settlements.map(s => s.id === settlement.id ? { ...s, isSettled: e.target.checked, settledDate: e.target.checked ? s.settledDate : undefined, amount: settlementAmount(reception, app, s) ?? s.amount } : s) })}/>{settlement.direction === "receive" ? "受領済み" : "相手へ支払い済み"}</label>
          {settlement.isSettled && <label className="form-field">
            <span>{settlement.direction==="receive"?"受領日":"相手への支払日"}</span>
            <input type="date" value={settlement.settledDate ?? ""} onChange={e => change({ ...payment, settlements: payment.settlements.map(s => s.id === settlement.id ? { ...s, settledDate: e.target.value || undefined } : s) })} />
          </label>}
          {!(payment.payerId==="self"&&settlement.direction==="receive"&&app.companionIds.includes(settlement.companionId))&&<button type="button" className="secondary-button" onClick={() => change({ ...payment, settlements: payment.settlements.filter(s => s.id !== settlement.id) })}>この精算を削除</button>}
        </div>)}

        {payment.payerId && payment.payerId !== "self" && !payment.settlements.some(s => s.companionId === payment.payerId && s.direction === "pay") && <button type="button" onClick={() => change({ ...payment, settlementRequired: true, settlements: [...payment.settlements, { id: generateId(), companionId: payment.payerId!, direction: "pay", important: true, tagIds: ["important", "settlement"], amount: share ?? 0, amountMode: "auto", isSettled: false }] })}>相手への支払いを登録</button>}
        </>}
      </section>;
    })}
  </section>;
}
