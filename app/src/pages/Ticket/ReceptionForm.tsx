import TicketReceptionImport from "./TicketReceptionImport";
import TicketIssuanceFields from "./TicketIssuanceFields";
import { issuanceError } from "../../services/ticketIssuance";
import type { EventPerformance } from "../../types/Event";
import { withCompanionSettlements } from "../../services/companionSettlements";
import TicketQuantityInput from "../../components/common/TicketQuantityInput";
import { canRemoveSeat, removeUnusedSeat, isLottery, receptionDates, withLotteryEntries } from "../../services/ticketReception";
import { generateId } from "../../services/id";
import { useEffect, useMemo, useRef, useState } from "react";
import { selectedTags } from "../../services/taskTags";
import TicketPayments from "./TicketPayments";
import { loadCompanions } from "../../services/storage";
import type { Companion } from "../../types/Companion";
import type { TicketReception, TicketFeeUnit } from "../../types/Ticket";

interface Props {
  sourceUrl?: string;
  hideHeading?: boolean;
  performances?: EventPerformance[];
  reception?: TicketReception;
  onSave?: (reception: TicketReception, newCompanions: Companion[]) => void | Promise<void>;
  onDraftChange?: (reception: TicketReception, newCompanions: Companion[], error: string) => void;
  fallbackName?: string;
  initialNewCompanions?: Companion[];
  onCancel?: () => void;
}

export default function ReceptionForm({ sourceUrl, hideHeading = false, performances = [], reception, onSave, onCancel, onDraftChange, fallbackName = "", initialNewCompanions = [] }: Props) {
  const [draft, setDraft] = useState<TicketReception>(() => reception ? withLotteryEntries({...reception,applications:reception.applications.map(a=>withCompanionSettlements(a,generateId))}, generateId) : {
    id: generateId(), name: "", seatTypes: [], fees: [], applications: [],
  });
  const [seatsOpen,setSeatsOpen] = useState(!reception?.seatTypes.length);
  const [savedApplicationIds] = useState(() => reception?.applications.map(a=>a.id) ?? []);
  const admission = draft.receptionType === "admission";
  const dates = receptionDates(draft);
  const lottery = isLottery(draft);
  // Empty amounts remain blank until entered; zero is a valid price.
  const [seats, setSeats] = useState(() => reception?.seatTypes.length ? reception.seatTypes.map(s => ({ ...s, price: String(s.price) })) : onDraftChange ? [{id:generateId(),name:"",price:""}] : []);
  const [fees, setFees] = useState(() => (reception?.fees ?? []).map(f => ({ ...f, amount: String(f.amount) })));
  const [initialCompanions] = useState(loadCompanions);
  const [companions, setCompanions] = useState(() => [...initialCompanions.map(c=>initialNewCompanions.find(item=>item.id===c.id)??c),...initialNewCompanions.filter(c=>!initialCompanions.some(existing=>existing.id===c.id))]);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const embedded = !!onDraftChange;
  useEffect(() => { if (!embedded) heading.current?.focus(); }, [embedded]);

  function validate(): string {
      for (const app of draft.applications) { const issue = app.fulfillment?.issuance; if (issue && issuanceError(issue)) return issuanceError(issue); }
      if (!(draft.name.trim() || fallbackName.trim())) { return "チケット情報名を入力してください。"; }
      if (seats.some(s => !(embedded && !s.name.trim() && !s.price.trim()) && ((!admission && !s.name.trim()) || !s.price.trim() || !Number.isSafeInteger(Number(s.price)) || Number(s.price) < 0)) ||
          fees.some(f => !f.name.trim() || !f.amount.trim() || !Number.isSafeInteger(Number(f.amount)) || Number(f.amount) < 0)) {
        return "券種・手数料の名称と0円以上の整数を入力してください。未定の行は削除できます。";
      }
      for (const [label, date, time] of dates) {
        if (draft[time] && !draft[date]) { return `${label}の時刻を設定する場合は日付も入力してください。`; }
      }
      if (dates.length > 0 && draft.applicationStartDate && draft.applicationDeadlineDate &&
          `${draft.applicationStartDate}T${draft.applicationStartTime || "00:00"}` > `${draft.applicationDeadlineDate}T${draft.applicationDeadlineTime || "23:59"}`) {
        return lottery ? "販売終了は販売開始以降に設定してください。" : "購入期限は販売開始以降に設定してください。";
      }
    return "";
  }
  const normalized = useMemo((): TicketReception => withLotteryEntries({ ...draft, applications: draft.applications.map(a => !a.fulfillment ? a : { ...a, fulfillment: { ...a.fulfillment, payment: { ...a.fulfillment.payment, tagIds: selectedTags(a.fulfillment.payment,"payment"), settlements: a.fulfillment.payment.settlements.map(s => ({ ...s, important: s.direction === "pay" ? true : s.important, tagIds: selectedTags(s,"settlement") })) } } }), name: draft.name.trim() || fallbackName.trim(), memo: draft.memo?.trim() || undefined,
          seatTypes: seats.filter(s=>!(embedded && !s.name.trim() && !s.price.trim())).map(s => ({ ...s, name: s.name.trim(), price: Number(s.price) })),
          fees: fees.map(f => ({ ...f, name: f.name.trim(), amount: Number(f.amount) })),
        }, generateId), [draft,seats,fees,fallbackName,embedded]);
  const newCompanions = companions.filter(c => !initialCompanions.some(existing => existing.id === c.id && JSON.stringify(existing) === JSON.stringify(c)));
  const lastEmission = useRef("");
  useEffect(() => {
    if (!onDraftChange) return;
    const value = normalized, validationError = validate();
    const signature = JSON.stringify([value, newCompanions, validationError]);
    if (signature === lastEmission.current) return;
    lastEmission.current = signature;
    onDraftChange(value, newCompanions, validationError);
  });
  const Container = embedded ? "div" : "form";

  return <section className={`event-detail-edit-section ticket-editor${embedded ? " ticket-editor-embedded" : ""}`} aria-label={embedded || hideHeading ? "チケット情報" : undefined} aria-labelledby={embedded || hideHeading ? undefined : "reception-editor-title"}>
    {!embedded && !hideHeading && <div className="event-detail-edit-heading">
      <p className="section-label">{reception ? "EDIT TICKET" : "ADD TICKET"}</p>
      <h2 id="reception-editor-title" ref={heading} tabIndex={-1}>{reception ? "チケット情報を編集" : "チケット情報を追加"}</h2>
      <p>わかっている情報だけ登録できます。未定の項目は後から追加・変更できます。</p>
    </div>}
    <Container className="form-stack" onInvalidCapture={event=>{
      let parent=(event.target as HTMLElement).parentElement;
      while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
      setSeatsOpen(true);
    }} onSubmit={async event => {
      event.preventDefault();
      setError("");
      const validationError = validate();
      if (validationError) { setError(validationError); return; }
      try {
        await onSave?.(normalized, newCompanions);

      } catch (error) {
        setError(error instanceof Error ? error.message : "保存できませんでした。入力内容は残しています。ブラウザの保存設定・容量や、チケット情報が削除されていないかを確認してください。");
      }
    }}>
      {!embedded && <TicketReceptionImport key={sourceUrl || 'manual'} sourceUrl={sourceUrl} onSeats={(items,group)=>{
        const additions=items.map(item=>({...item,name:`${group}／${item.name}`,price:String(item.price)}));
        const next=[...seats,...additions.filter(item=>!seats.some(s=>s.name===item.name&&s.price===item.price)).map(item=>({...item,id:generateId()}))];
        setSeats(next);
        if(admission || lottery)setDraft(current=>withLotteryEntries({...current,seatTypes:next.map(s=>({...s,price:Number(s.price)}))},generateId));
      }} onApply={(candidate,source)=>{
        const {mode,bookingUrl,note,...fields}=candidate;
        setDraft(previous=>({...previous,...fields,name:mode==='ライブビューイング'?`ライブビューイング：${fields.name}`:fields.name,
          memo:[previous.memo,`読み取り元：${source}`,bookingUrl?`申込先：${bookingUrl}`:'',note].filter(Boolean).filter((line,index,items)=>items.indexOf(line)===index).join('\n')}));
      }}/>}
      {!embedded && <><label className="form-field"><span>チケット情報名{fallbackName.trim()?"（任意）":"（必須）"}</span>
        <input required={!fallbackName.trim()} value={draft.name} placeholder="例：FC先行" onChange={e => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label className="form-field"><span>チケットの種類</span><select value={draft.receptionType ?? "lottery"} onChange={e => {
        const type = e.target.value as TicketReception["receptionType"];
        const nextSeats = type === "admission" && seats.length === 0 ? [{ id: generateId(), name: "", price: "" }] : seats;
        setSeats(nextSeats);
        setDraft(withLotteryEntries({ ...draft, receptionType: type, seatTypes: nextSeats.map(s => ({ ...s, price: Number(s.price) })) }, generateId));
      }}><option value="lottery">抽選チケット</option><option value="general">先着販売チケット</option><option value="admission">入場券・映画など</option></select></label></>}
      {dates.length > 0 && <section className="ticket-schedule" >
        <h3 >{lottery ? "販売・抽選日程" : "販売日程"}</h3>
        <p>{lottery ? "販売開始・終了と、抽選結果の発表日時を入力してください。" : "販売開始と購入期限を入力できます。購入済みの場合など、不要な日程は空欄で構いません。"}</p>
      {dates.map(([label, date, time]) => <fieldset className="ticket-date" key={date}>
        <legend>{label}</legend><div className="ticket-form-row">
          <label className="form-field"><span>日付</span><input type="date" aria-label={`${label}日`} value={draft[date] ?? ""} onChange={e => setDraft({ ...draft, [date]: e.target.value || undefined })}/></label>
          <label className="form-field"><span>時刻</span><input type="time" aria-label={`${label}時刻`} value={draft[time] ?? ""} onChange={e => setDraft({ ...draft, [time]: e.target.value || undefined })}/></label>
        </div>
      </fieldset>)}
      </section>}
      <details className="ticket-options ticket-collapsible" open={seatsOpen} onToggle={e=>setSeatsOpen(e.currentTarget.open)}><summary>券種・料金：{seats.length}件</summary>
        <p>{admission ? "金額と枚数を入力してください。券種名は不要です。" : "券種は複数登録できます。未定なら追加せず保存してください。"}</p>
        {seats.map((seat, i) => {
          const inUse = !canRemoveSeat(draft, seat.id);
          const applications = draft.applications.filter(a => a.seatTypeId === seat.id || (!a.seatTypeId && seats.length===1));
          return <div className="ticket-option-row ticket-seat-row" key={seat.id}>
            {(!admission || !!seat.name || !inUse) && <div className="ticket-seat-heading">{(!admission || !!seat.name) ? <label htmlFor={`seat-name-${seat.id}`}>券種 {i + 1}</label> : <span>チケット {i + 1}</span>}{!inUse && <button type="button" className="secondary-button ticket-seat-remove" aria-label={`券種 ${i + 1}を削除`} onClick={() => { setSeats(current=>current.filter(s=>s.id!==seat.id)); setDraft(current=>removeUnusedSeat(current,seat.id)); }}>削除</button>}</div>}
            {(!admission || !!seat.name) && <label className="form-field"><input id={`seat-name-${seat.id}`} required={!embedded || !!seat.price.trim()} placeholder="例：一般・学生・S席・入場料" value={seat.name} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, name: e.target.value } : s))}/></label>}
            <div className={admission ? "ticket-price-quantity" : "ticket-seat-amounts"}><label className="form-field"><span>1枚あたりの料金（円）</span><input required={!embedded || !!seat.name.trim()} type="number" className="money-input" inputMode="numeric" min="0" step="1" value={seat.price} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, price: e.target.value } : s))}/></label>
            {<>
              {applications.map((a, index) => <label className="form-field" key={a.id}><span>{lottery ? "申込枚数" : "購入枚数"}{applications.length > 1 ? `（${performances.find(p=>p.id===a.performanceId)?.name || `申込 ${index+1}`}）` : ""}</span><TicketQuantityInput value={a.quantity} onChange={quantity => setDraft({ ...draft, applications: draft.applications.map(item => item.id === a.id ? { ...item, quantity } : item) })}/></label>)}
            </>}</div>
            {admission && <>
              <label className="ticket-check"><input type="checkbox" checked={seat.hasBenefit ?? false} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, hasBenefit: e.target.checked } : s))} />特典あり</label>
            </>}

          </div>;
        })}
        {draft.applications.filter(a => !seats.some(s=>s.id===a.seatTypeId) && !(!a.seatTypeId && seats.length===1)).map((a,index)=><label className="form-field" key={a.id}><span>{lottery ? "申込枚数" : "購入枚数"}（券種未選択・申込 {index+1}）</span><TicketQuantityInput value={a.quantity} onChange={quantity=>setDraft({...draft,applications:draft.applications.map(item=>item.id===a.id?{...item,quantity}:item)})}/></label>)}
        <button type="button" className="secondary-button ticket-seat-add" onClick={() => {
          const next = [...seats, { id: generateId(), name: "", price: "" }]; setSeats(next);
          if (admission || lottery) setDraft(withLotteryEntries({ ...draft, seatTypes: next.map(s => ({ ...s, price: Number(s.price) })) }, generateId));
        }}>＋ {admission ? "チケットを追加" : "券種を追加"}</button>
        <button type="button" className="secondary-button" onClick={e=>{
          const section=e.currentTarget.closest('details');
          const invalid=Array.from(section?.querySelectorAll('input')??[]).find(input=>!input.checkValidity());
          if(invalid){invalid.reportValidity();return;}
          setSeatsOpen(false);
        }}>券種の入力を完了して閉じる</button>
        <p>入力内容は、最後にチケット情報を保存すると登録されます。</p>
      </details>
      <section className="ticket-options" ><h3 >手数料</h3>
        <p>未定なら追加せず保存できます。</p>
        {fees.map((fee, i) => <div className="ticket-option-row" key={fee.id}>
          <label className="form-field"><span>手数料名 {i + 1}</span><input required placeholder="例：システム利用料" value={fee.name} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, name: e.target.value } : f))}/></label>
          <label className="form-field"><span>金額（円）</span><input required type="number" className="money-input" inputMode="numeric" min="0" step="1" value={fee.amount} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, amount: e.target.value } : f))}/></label>
          <label className="form-field"><span>計算単位</span><select value={fee.unit} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, unit: e.target.value as TicketFeeUnit } : f))}><option value="perTicket">1枚ごと</option><option value="perApplication">1申込ごと</option></select></label>
          <button type="button" className="secondary-button" aria-label={`手数料 ${i + 1}を削除`} onClick={() => setFees(fees.filter(f => f.id !== fee.id))}>削除</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setFees([...fees, { id: generateId(), name: "", amount: "", unit: "perTicket" }])}>＋ 手数料を追加</button>
      </section>
      <label className="form-field"><span>メモ</span><textarea rows={4} value={draft.memo ?? ""} onChange={e => setDraft({ ...draft, memo: e.target.value })}/></label>
      {<TicketPayments savedApplicationIds={savedApplicationIds} performances={performances} reception={{ ...draft, seatTypes: seats.map(s => ({ ...s, price: s.price === "" ? NaN : Number(s.price) })), fees: fees.map(f => ({ ...f, amount: f.amount === "" ? NaN : Number(f.amount) })) }} companions={companions} onChange={setDraft} onCompanionsChange={setCompanions} />}
      <TicketIssuanceFields reception={{...draft,seatTypes:seats.map(s=>({...s,price:Number(s.price)}))}} performances={performances} onChange={setDraft}/>
      {error && <p role="alert">{error}</p>}
      {!embedded && <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button><button type="submit" className="primary-button">{reception ? "変更を保存" : "チケット情報を登録"}</button></div>}
    </Container>
  </section>;
}
