import { useState } from 'react';
import { Link } from 'react-router';
import { loadCompanions, loadTickets, transactTicketSettlements } from '../../services/storage';
import { loadTicketTasks, type TicketTask } from '../../services/ticketTasks';
import { paymentSettlementEntry, registerPaymentSettlement } from '../../services/paymentSettlementEntry';
import { generateId } from '../../services/id';
import SettlementTaskForm from './SettlementTaskForm';

export default function PaymentOffsetEntry({ task, open, onOpenChange, onSaved }: {
  task: TicketTask; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [companionId, setCompanionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const entry = paymentSettlementEntry(loadTickets(), task);
  const companions = loadCompanions();
  const name = (id: string) => companions.find(c => c.id === id)?.name ?? '未登録の同行者';
  const related = loadTicketTasks().filter(t => t.settlementId && t.ticketId === task.ticketId && t.receptionId === task.receptionId && t.applicationId === task.applicationId);
  const pending = related.filter(t => !t.completed);
  const selected = related.find(t => t.settlementId === selectedId) ?? (pending.length === 1 ? pending[0] : undefined);
  const missing = entry?.companionIds.filter(id => !entry.payment.settlements.some(s => s.companionId === id)) ?? [];
  const recipient = missing.includes(companionId) ? companionId : missing.length === 1 ? missing[0] : '';
  const canRegister = !!entry && entry.application.status === 'won' && Number.isSafeInteger(entry.amount) && entry.amount! > 0;
  const editUrl = `/events/${task.eventId}/tickets/${task.receptionId}/edit#${task.applicationId}`;
  async function register() {
    if (busy || !entry || !recipient) return;
    setBusy(true); setError('');
    try {
      const settlementId = await transactTicketSettlements(tickets => {
        const result = registerPaymentSettlement(tickets, task, recipient, entry.fingerprint, generateId());
        return { tickets: result.tickets, result: result.settlementId };
      }, true);
      setSelectedId(settlementId); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : '登録できませんでした。もう一度お試しください。'); }
    finally { setBusy(false); }
  }
  return <section className="payment-offset-entry">
    <h2>精算方法</h2>
    <p>同行者との支払い・受け取りを、別のイベントと相殺できます。</p>
    <fieldset className="settlement-method"><legend>支払いの記録方法</legend><label className="ticket-check"><input type="radio" name="purchaseMethod" checked={!open} onChange={()=>onOpenChange(false)}/>通常の支払い</label><label className="ticket-check"><input type="radio" name="purchaseMethod" checked={open} onChange={()=>onOpenChange(true)}/>他のイベントと相殺</label></fieldset>
    {open && <>
      <p>このチケットの同行者精算を使います。相殺しても、チケット購入自体の支払い状況は変更しません。</p>
      {related.length > 0 && <label className="form-field">相殺元の支払い・受け取り<select value={selected?.settlementId ?? ''} onChange={e => { setSelectedId(e.target.value); setError(''); }}>
        <option value="" disabled>同行者の精算を選択</option>
        {related.map(t => <option key={t.settlementId} value={t.settlementId}>{t.person}さん{t.receive ? 'から受け取る' : 'へ支払う'} — {t.amount === undefined ? '金額未設定' : `${t.amount.toLocaleString('ja-JP')}円`}{t.completed ? '（精算済み・履歴）' : ''}</option>)}
      </select></label>}
      {selected && <SettlementTaskForm key={selected.settlementId} task={selected} initialMode={selected.completed ? 'normal' : 'offset'} onSaved={onSaved}/>}
      {missing.length > 0 && <section className="ticket-options">
        <h3>同行者との精算を登録</h3>
        <p>まだ登録されていない精算です。チケット情報から1枚分の金額を引き継ぎます。</p>
        {missing.length > 1 && <label className="form-field">精算する同行者<select value={recipient} onChange={e => setCompanionId(e.target.value)}><option value="">同行者を選択</option>{missing.map(id => <option key={id} value={id}>{name(id)}さん</option>)}</select></label>}
        {recipient && <p>{name(recipient)}さん{entry?.direction === 'pay' ? 'へ支払う' : 'から受け取る'}：{entry?.amount === undefined ? '金額未設定' : `${entry.amount.toLocaleString('ja-JP')}円`}（チケット1枚分・手数料込み）</p>}
        <button type="button" disabled={busy || !recipient || !canRegister} onClick={() => void register()}>{busy ? '登録中…' : 'この精算を登録してイベントを選ぶ'}</button>
        <Link className="task-navigation-button" to={editUrl}>金額・同行者を確認／変更する</Link>
      </section>}
      {!related.length && !missing.length && <p>相殺元となる同行者の精算がまだ登録されていません。<Link to={editUrl}>チケット情報で同行者との精算を登録</Link>してください。</p>}
      {missing.length > 0 && !canRegister && <p>チケット情報で購入・当選状況と金額を確認してください。</p>}
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}
