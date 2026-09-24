import { useEffect, useRef, useState } from "react";
import type { TicketReception, TicketFeeUnit } from "../../types/Ticket";

interface Props {
  reception?: TicketReception;
  onSave: (reception: TicketReception) => void;
  onCancel: () => void;
}

const dates = [
  ["申込開始", "applicationStartDate", "applicationStartTime"],
  ["申込締切", "applicationDeadlineDate", "applicationDeadlineTime"],
  ["当落発表", "resultDate", "resultTime"],
] as const;

export default function ReceptionForm({ reception, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<TicketReception>(() => reception ?? {
    id: crypto.randomUUID(), name: "", seatTypes: [], fees: [], applications: [],
  });
  // Empty amounts remain blank until entered; zero is a valid price.
  const [seats, setSeats] = useState(() => (reception?.seatTypes ?? []).map(s => ({ ...s, price: String(s.price) })));
  const [fees, setFees] = useState(() => (reception?.fees ?? []).map(f => ({ ...f, amount: String(f.amount) })));
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="event-detail-edit-section ticket-editor" aria-labelledby="reception-editor-title">
    <div className="event-detail-edit-heading">
      <p className="section-label">{reception ? "EDIT RECEPTION" : "ADD RECEPTION"}</p>
      <h2 id="reception-editor-title" ref={heading} tabIndex={-1}>{reception ? "受付を編集" : "受付を追加"}</h2>
      <p>わかっている情報だけ登録できます。未定の項目は後から追加・変更できます。</p>
    </div>
    <form className="form-stack" onSubmit={event => {
      event.preventDefault();
      setError("");
      if (!draft.name.trim()) { setError("受付名を入力してください。"); return; }
      if (seats.some(s => !s.name.trim() || !s.price.trim() || !Number.isSafeInteger(Number(s.price)) || Number(s.price) < 0) ||
          fees.some(f => !f.name.trim() || !f.amount.trim() || !Number.isSafeInteger(Number(f.amount)) || Number(f.amount) < 0)) {
        setError("席種・手数料の名称と0円以上の整数を入力してください。未定の行は削除できます。"); return;
      }
      for (const [label, date, time] of dates) {
        if (draft[time] && !draft[date]) { setError(`${label}の時刻を設定する場合は日付も入力してください。`); return; }
      }
      if (draft.applicationStartDate && draft.applicationDeadlineDate &&
          `${draft.applicationStartDate}T${draft.applicationStartTime || "00:00"}` > `${draft.applicationDeadlineDate}T${draft.applicationDeadlineTime || "23:59"}`) {
        setError("申込締切は申込開始以降に設定してください。"); return;
      }
      try {
        onSave({ ...draft, name: draft.name.trim(), memo: draft.memo?.trim() || undefined,
          seatTypes: seats.map(s => ({ ...s, name: s.name.trim(), price: Number(s.price) })),
          fees: fees.map(f => ({ ...f, name: f.name.trim(), amount: Number(f.amount) })),
        });
      } catch {
        setError("保存できませんでした。入力内容は残しています。ブラウザの保存設定・容量や、受付が削除されていないかを確認してください。");
      }
    }}>
      <label className="form-field"><span>受付名（必須）</span>
        <input required value={draft.name} placeholder="例：FC先行" onChange={e => setDraft({ ...draft, name: e.target.value })} />
      </label>
      {dates.map(([label, date, time]) => <fieldset className="ticket-date" key={date}>
        <legend>{label}</legend><div className="ticket-form-row">
          <label className="form-field"><span>日付</span><input type="date" aria-label={`${label}日`} value={draft[date] ?? ""} onChange={e => setDraft({ ...draft, [date]: e.target.value || undefined })}/></label>
          <label className="form-field"><span>時刻</span><input type="time" aria-label={`${label}時刻`} value={draft[time] ?? ""} onChange={e => setDraft({ ...draft, [time]: e.target.value || undefined })}/></label>
        </div>
      </fieldset>)}
      <fieldset className="ticket-options"><legend>席種・チケット代</legend>
        <p>席種は複数登録できます。未定なら追加せず保存してください。</p>
        {seats.map((seat, i) => {
          const inUse = reception?.applications.some(a => a.seatTypeId === seat.id);
          return <div className="ticket-option-row" key={seat.id}>
            <label className="form-field"><span>席種 {i + 1}</span><input required placeholder="例：指定席" value={seat.name} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, name: e.target.value } : s))}/></label>
            <label className="form-field"><span>チケット代（円／枚）</span><input required type="number" min="0" step="1" value={seat.price} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, price: e.target.value } : s))}/></label>
            <button type="button" className="secondary-button" disabled={inUse} aria-label={`席種 ${i + 1}を削除`} onClick={() => setSeats(seats.filter(s => s.id !== seat.id))}>削除</button>
            {inUse && <small>申込で使用中のため削除できません。</small>}
          </div>;
        })}
        <button type="button" className="secondary-button" onClick={() => setSeats([...seats, { id: crypto.randomUUID(), name: "", price: "" }])}>＋ 席種を追加</button>
      </fieldset>
      <fieldset className="ticket-options"><legend>手数料</legend>
        <p>未定なら追加せず保存できます。</p>
        {fees.map((fee, i) => <div className="ticket-option-row" key={fee.id}>
          <label className="form-field"><span>手数料名 {i + 1}</span><input required placeholder="例：システム利用料" value={fee.name} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, name: e.target.value } : f))}/></label>
          <label className="form-field"><span>金額（円）</span><input required type="number" min="0" step="1" value={fee.amount} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, amount: e.target.value } : f))}/></label>
          <label className="form-field"><span>計算単位</span><select value={fee.unit} onChange={e => setFees(fees.map(f => f.id === fee.id ? { ...f, unit: e.target.value as TicketFeeUnit } : f))}><option value="perTicket">1枚ごと</option><option value="perApplication">1申込ごと</option></select></label>
          <button type="button" className="secondary-button" aria-label={`手数料 ${i + 1}を削除`} onClick={() => setFees(fees.filter(f => f.id !== fee.id))}>削除</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setFees([...fees, { id: crypto.randomUUID(), name: "", amount: "", unit: "perTicket" }])}>＋ 手数料を追加</button>
      </fieldset>
      <label className="form-field"><span>メモ</span><textarea rows={4} value={draft.memo ?? ""} onChange={e => setDraft({ ...draft, memo: e.target.value })}/></label>
      {error && <p role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button><button type="submit" className="primary-button">{reception ? "変更を保存" : "受付を登録"}</button></div>
    </form>
  </section>;
}
