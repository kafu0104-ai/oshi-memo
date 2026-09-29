import { withCompanionSettlements } from "../../services/companionSettlements";
import TicketQuantityInput from "../../components/common/TicketQuantityInput";
import { isLottery, receptionDates, withLotteryEntries } from "../../services/ticketReception";
import { generateId } from "../../services/id";
import { useEffect, useRef, useState } from "react";
import { selectedTags } from "../../services/taskTags";
import TicketPayments from "./TicketPayments";
import { loadCompanions } from "../../services/storage";
import type { Companion } from "../../types/Companion";
import type { TicketReception, TicketFeeUnit } from "../../types/Ticket";

interface Props {
  reception?: TicketReception;
  onSave: (reception: TicketReception, newCompanions: Companion[]) => void;
  onCancel: () => void;
}

export default function ReceptionForm({ reception, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<TicketReception>(() => reception ? withLotteryEntries({...reception,applications:reception.applications.map(a=>withCompanionSettlements(a,generateId))}, generateId) : {
    id: generateId(), name: "", seatTypes: [], fees: [], applications: [],
  });
  const admission = draft.receptionType === "admission";
  const dates = receptionDates(draft);
  const lottery = isLottery(draft);
  // Empty amounts remain blank until entered; zero is a valid price.
  const [seats, setSeats] = useState(() => (reception?.seatTypes ?? []).map(s => ({ ...s, price: String(s.price) })));
  const [fees, setFees] = useState(() => (reception?.fees ?? []).map(f => ({ ...f, amount: String(f.amount) })));
  const [initialCompanions] = useState(loadCompanions);
  const [companions, setCompanions] = useState(initialCompanions);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="event-detail-edit-section ticket-editor" aria-labelledby="reception-editor-title">
    <div className="event-detail-edit-heading">
      <p className="section-label">{reception ? "EDIT TICKET" : "ADD TICKET"}</p>
      <h2 id="reception-editor-title" ref={heading} tabIndex={-1}>{reception ? "チケット情報を編集" : "チケット情報を追加"}</h2>
      <p>わかっている情報だけ登録できます。未定の項目は後から追加・変更できます。</p>
    </div>
    <form className="form-stack" onSubmit={event => {
      event.preventDefault();
      setError("");
      if (!draft.name.trim()) { setError("チケット情報名を入力してください。"); return; }
      if (seats.some(s => (!admission && !s.name.trim()) || !s.price.trim() || !Number.isSafeInteger(Number(s.price)) || Number(s.price) < 0) ||
          fees.some(f => !f.name.trim() || !f.amount.trim() || !Number.isSafeInteger(Number(f.amount)) || Number(f.amount) < 0)) {
        setError("券種・手数料の名称と0円以上の整数を入力してください。未定の行は削除できます。"); return;
      }
      for (const [label, date, time] of dates) {
        if (draft[time] && !draft[date]) { setError(`${label}の時刻を設定する場合は日付も入力してください。`); return; }
      }
      if (dates.length > 0 && draft.applicationStartDate && draft.applicationDeadlineDate &&
          `${draft.applicationStartDate}T${draft.applicationStartTime || "00:00"}` > `${draft.applicationDeadlineDate}T${draft.applicationDeadlineTime || "23:59"}`) {
        setError(lottery ? "販売終了は販売開始以降に設定してください。" : "購入期限は販売開始以降に設定してください。"); return;
      }
      try {
        onSave(withLotteryEntries({ ...draft, applications: draft.applications.map(a => !a.fulfillment ? a : { ...a, fulfillment: { ...a.fulfillment, payment: { ...a.fulfillment.payment, tagIds: selectedTags(a.fulfillment.payment,"payment"), settlements: a.fulfillment.payment.settlements.map(s => ({ ...s, important: s.direction === "pay" ? true : s.important, tagIds: s.direction === "pay" ? ["important", "payment"] : selectedTags(s,"income") })) } } }), name: draft.name.trim(), memo: draft.memo?.trim() || undefined,
          seatTypes: seats.map(s => ({ ...s, name: s.name.trim(), price: Number(s.price) })),
          fees: fees.map(f => ({ ...f, name: f.name.trim(), amount: Number(f.amount) })),
        }, generateId), companions.filter(c => !initialCompanions.some(existing => existing.id === c.id)));
      } catch {
        setError("保存できませんでした。入力内容は残しています。ブラウザの保存設定・容量や、チケット情報が削除されていないかを確認してください。");
      }
    }}>
      <label className="form-field"><span>チケット情報名（必須）</span>
        <input required value={draft.name} placeholder="例：FC先行" onChange={e => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label className="form-field"><span>チケットの種類</span><select value={draft.receptionType ?? "lottery"} onChange={e => {
        const type = e.target.value as TicketReception["receptionType"];
        const nextSeats = type === "admission" && seats.length === 0 ? [{ id: generateId(), name: "", price: "" }] : seats;
        setSeats(nextSeats);
        setDraft(withLotteryEntries({ ...draft, receptionType: type, seatTypes: nextSeats.map(s => ({ ...s, price: Number(s.price) })) }, generateId));
      }}><option value="lottery">抽選チケット</option><option value="general">先着販売チケット</option><option value="admission">入場券・映画など</option></select></label>
      {dates.length > 0 && <section className="ticket-schedule" aria-labelledby="ticket-schedule-title">
        <h3 id="ticket-schedule-title">{lottery ? "販売・抽選日程" : "販売日程"}</h3>
        <p>{lottery ? "販売開始・終了と、抽選結果の発表日時を入力してください。" : "販売開始と購入期限を入力できます。購入済みの場合など、不要な日程は空欄で構いません。"}</p>
      {dates.map(([label, date, time]) => <fieldset className="ticket-date" key={date}>
        <legend>{label}</legend><div className="ticket-form-row">
          <label className="form-field"><span>日付</span><input type="date" aria-label={`${label}日`} value={draft[date] ?? ""} onChange={e => setDraft({ ...draft, [date]: e.target.value || undefined })}/></label>
          <label className="form-field"><span>時刻</span><input type="time" aria-label={`${label}時刻`} value={draft[time] ?? ""} onChange={e => setDraft({ ...draft, [time]: e.target.value || undefined })}/></label>
        </div>
      </fieldset>)}
      </section>}
      <section className="ticket-options" aria-labelledby="ticket-seats-title"><h3 id="ticket-seats-title">{admission ? "チケット情報" : "チケット情報（券種・料金）"}</h3>
        <p>{admission ? "金額と枚数を入力してください。券種名は不要です。" : "券種は複数登録できます。未定なら追加せず保存してください。"}</p>
        {lottery && <p>登録後、「チケット情報を編集」から券種ごとの当落ステータスを選べます。</p>}
        {seats.map((seat, i) => {
          const inUse = draft.applications.some(a => a.seatTypeId === seat.id);
          const applications = draft.applications.filter(a => a.seatTypeId === seat.id);
          return <div className="ticket-option-row ticket-seat-row" key={seat.id}>
            {!inUse && <button type="button" className="secondary-button ticket-seat-remove" aria-label={`券種 ${i + 1}を削除`} onClick={() => setSeats(seats.filter(s => s.id !== seat.id))}>削除</button>}
            {(!admission || !!seat.name) && <label className="form-field"><span>券種 {i + 1}</span><input required placeholder="例：一般・学生・S席・入場料" value={seat.name} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, name: e.target.value } : s))}/></label>}
            <div className={admission ? "ticket-price-quantity" : ""}><label className="form-field"><span>料金（円／枚）</span><input required type="number" min="0" step="1" value={seat.price} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, price: e.target.value } : s))}/></label>
            {admission && <>
              {applications.map(a => <label className="form-field" key={a.id}><span>枚数</span><TicketQuantityInput value={a.quantity} onChange={quantity => setDraft({ ...draft, applications: draft.applications.map(item => item.id === a.id ? { ...item, quantity } : item) })}/></label>)}
            </>}</div>
            {admission && <>
              <label className="ticket-check"><input type="checkbox" checked={seat.hasBenefit ?? false} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, hasBenefit: e.target.checked } : s))} />特典あり</label>
            </>}

          </div>;
        })}
        <button type="button" className="secondary-button ticket-seat-add" onClick={() => {
          const next = [...seats, { id: generateId(), name: "", price: "" }]; setSeats(next);
          if (admission) setDraft(withLotteryEntries({ ...draft, seatTypes: next.map(s => ({ ...s, price: Number(s.price) })) }, generateId));
        }}>＋ {admission ? "チケットを追加" : "券種を追加"}</button>
      </section>
      <section className="ticket-options" aria-labelledby="ticket-fees-title"><h3 id="ticket-fees-title">手数料</h3>
        <p>未定なら追加せず保存できます。</p>
        {fees.map((fee, i) => <div className="ticket-option-row" key={fee.id}>
          <label className="form-field"><span>手数料名 {i + 1}</span><input required placeholder="例：システム利用料" value={fee.name} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, name: e.target.value } : f))}/></label>
          <label className="form-field"><span>金額（円）</span><input required type="number" min="0" step="1" value={fee.amount} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, amount: e.target.value } : f))}/></label>
          <label className="form-field"><span>計算単位</span><select value={fee.unit} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, unit: e.target.value as TicketFeeUnit } : f))}><option value="perTicket">1枚ごと</option><option value="perApplication">1申込ごと</option></select></label>
          <button type="button" className="secondary-button" aria-label={`手数料 ${i + 1}を削除`} onClick={() => setFees(fees.filter(f => f.id !== fee.id))}>削除</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setFees([...fees, { id: generateId(), name: "", amount: "", unit: "perTicket" }])}>＋ 手数料を追加</button>
      </section>
      <label className="form-field"><span>メモ</span><textarea rows={4} value={draft.memo ?? ""} onChange={e => setDraft({ ...draft, memo: e.target.value })}/></label>
      {(!lottery || !!reception) && <TicketPayments reception={{ ...draft, seatTypes: seats.map(s => ({ ...s, price: s.price === "" ? NaN : Number(s.price) })), fees: fees.map(f => ({ ...f, amount: f.amount === "" ? NaN : Number(f.amount) })) }} companions={companions} onChange={setDraft} onCompanionsChange={setCompanions} />}
      {error && <p role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button><button type="submit" className="primary-button">{reception ? "変更を保存" : "チケット情報を登録"}</button></div>
    </form>
  </section>;
}
