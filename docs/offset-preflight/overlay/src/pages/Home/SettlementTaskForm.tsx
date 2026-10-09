import OffsetLinks from '../../components/common/OffsetLinks';
import { offsetGroups, offsetGroupUrl } from '../../services/offsetGroups';
import { useState } from 'react';
import { Link } from 'react-router';
import { loadEvents, loadTickets, transactTicketSettlements } from '../../services/storage';
import { applyOffset, applySettlementCash, calculateOffset, offsetCandidates, settlementItems, settlementKey, hasOffset, type SettlementItem } from '../../services/settlementOffsets';
import { generateId } from '../../services/id';
import { localToday, type TicketTask } from '../../services/ticketTasks';
import type { SettlementOffset } from '../../types/SettlementOffset';

const money = (n: number) => `${n.toLocaleString('ja-JP')}円`;
const direction = (d: 'pay' | 'receive' | undefined, person: string) => d ? d === 'pay' ? `自分 → ${person}さん` : `${person}さん → 自分` : '金銭の授受なし';
const url = (item: { ticketId: string; receptionId: string; applicationId: string; settlementId: string }) => `/tasks/${item.ticketId}/${item.receptionId}/${item.applicationId}/${item.settlementId}`;
const read = () => ({ tickets: loadTickets(), events: loadEvents() });

export default function SettlementTaskForm({ task, onSaved, initialMode = 'normal' }: { task: TicketTask; onSaved: () => void; initialMode?: 'normal' | 'offset' | 'combined' }) {
  const [snapshot, setSnapshot] = useState(read);
  const [mode, setMode] = useState<'normal' | 'offset' | 'combined'>(initialMode);
  const [cashDate, setCashDate] = useState(task.dateLabel === '相殺完了日' ? '' : task.date ?? '');
  const [offsetDate, setOffsetDate] = useState(localToday);
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const items = settlementItems(snapshot.tickets, snapshot.events);
  const source = items.find(i => settlementKey(i) === settlementKey({ ...task, settlementId: task.settlementId! }));
  if (!source) return <p role="alert">精算情報が見つかりません。</p>;
  const candidates = offsetCandidates(source, items);
  const sameDirection = items.filter(i => i.eligible && i.companionId === source.companionId && i.direction === source.direction && settlementKey(i) !== settlementKey(source));
  const targets = candidates.filter(i => selected.includes(settlementKey(i)));
  const groups = [...new Set(candidates.map(i => i.eventId))].map(id => ({ id, items: candidates.filter(i => i.eventId === id) }));
  let calculation: ReturnType<typeof calculateOffset> | undefined;
  try { if (targets.length) calculation = calculateOffset(source, targets); } catch { /* Shown on submit; never permit invalid saving. */ }
  const histories = snapshot.tickets.flatMap(t => t.offsetHistory ?? []).filter(h => h.allocations.some(a => settlementKey(a) === settlementKey(source)));
  const activeGroup = offsetGroups(snapshot.tickets,snapshot.events).find(g => !g.cancelled && g.histories.some(h=>h.allocations.some(a=>settlementKey(a)===settlementKey(source))));
  const completedByOffset = source.settlement.isSettled && hasOffset(source.settlement);
  const edit = () => { setReview(false); setError(''); setSuccess(''); };
  const toggle = (group: SettlementItem[], checked: boolean) => {
    const keys = group.map(settlementKey); edit();
    setSelected(current => checked ? [...new Set([...current, ...keys])] : current.filter(k => !keys.includes(k)));
  };
  async function submit() {
    if (busy) return;
    setError('');
    try {
      if (mode !== 'normal') {
        if (!calculation) throw new Error('相殺する項目を選択してください。');
        if (!offsetDate || (mode === 'combined' && calculation.remainingAmount > 0 && !cashDate)) throw new Error('相殺日と、差額がある場合は支払日・受取日を入力してください。');
        if (selected.some(key => !candidates.some(i => settlementKey(i) === key))) throw new Error('選択した精算情報が変更されています。最新の内容を読み直してください。');
        if (!review) { setReview(true); return; }
      }
      setBusy(true);
      if (mode === 'normal') {
        if (activeGroup) throw new Error('相殺グループから差額を精算してください。');
        await transactTicketSettlements((tickets, events) => ({ tickets: applySettlementCash(tickets, events, source!, cashDate), result: undefined }), hasOffset(source!.settlement));
        setSuccess('支払い・受け取りを記録しました。関連するToDoを更新しました。');
      } else {
        const history = await transactTicketSettlements((tickets, events) => {
          const result = applyOffset(tickets, events, { source: source!, targets, offsetDate, cashDate, settleRemainder: mode === 'combined' }, generateId(), new Date().toISOString());
          return { tickets: result.tickets, result: result.history };
        }, true);
        setSuccess(history.status === 'pending' ? `相殺を記録しました。差額 ${money(history.remainingAmount)} を1件の相殺タスクで管理します。` : '精算を完了しました。双方のToDoを更新しました。');
      }
      setSnapshot(read()); setSelected([]); setReview(false); setMode('normal'); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : '保存できませんでした。保存容量と設定を確認してください。'); setReview(false); }
    finally { setBusy(false); }
  }
  return <section className="settlement-task">
    <OffsetLinks settlement={source}/>
    {source.directionWarning && <p role="status">支払者・同行者の設定と精算方向が異なります。個別の負担条件もあるため、実際の内容を確認してから相殺してください。<Link to={`/events/${source.eventId}/tickets/${source.receptionId}/edit#${source.applicationId}`}>精算方向を確認・訂正する</Link></p>}
    {activeGroup && <p><Link className="task-navigation-button" to={offsetGroupUrl(activeGroup.id)}>相殺グループの差額精算・履歴・取り消し</Link></p>}
    {hasOffset(source.settlement) && <dl className="task-facts settlement-balance"><dt>元の金額</dt><dd>{money(source.total!)}</dd><dt>相殺済み</dt><dd>{money(source.settlement.offsetAmount ?? 0)}</dd><dt>実際に授受した金額</dt><dd>{money(source.settlement.cashAmount ?? 0)}{source.settlement.settledDate && `（${source.settlement.settledDate}）`}</dd><dt>未精算残額</dt><dd>{money(source.remaining ?? 0)}</dd></dl>}
    {success && <p className="settlement-notice" role="status">{success}</p>}
    {!completedByOffset && <form className="task-completion-form" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <fieldset disabled={busy} className="settlement-method"><legend>精算方法</legend>
        {([['normal', '通常支払い'], ['offset', '他のイベントと相殺']] as const).map(([value, label]) => <label className="ticket-check" key={value}><input type="radio" name="settlementMethod" value={value} checked={value === 'normal' ? mode === 'normal' : mode !== 'normal'} disabled={(value !== 'normal' && !source.eligible) || (value === 'normal' && !!activeGroup)} onChange={() => { edit(); setMode(value); }}/>{label}</label>)}
      </fieldset>
      {mode !== 'normal' && <>
        <label className="ticket-check"><input type="checkbox" disabled={busy} checked={mode === 'combined'} onChange={e=>{edit();setMode(e.target.checked?'combined':'offset');}}/>相殺＋差額精算（差額の支払い・受け取りも済んでいる）</label><p>チェックしない場合は相殺のみ記録し、差額を未精算のまま管理します。</p>
        <h2>相殺するイベントを選択</h2>{targets.length > 0 && <p><span className="task-tag">相殺予定</span> 未確定・保存されていません</p>}
        <p>{task.person}さんとの、{source.direction === 'receive' ? '相手が立て替えた支払い' : '自分が立て替えた受け取り'}を表示しています。複数選択できます。</p>
        {groups.length === 0 && <>
          <p role="status">相殺できる未精算項目はありません。同じ同行者との「支払い」と「受け取り」を相殺できます。</p>
          {sameDirection.length > 0 && <section className="ticket-options"><h3>同じ方向のため相殺できない精算</h3><p>以下はどちらも{source.direction === 'pay' ? '自分から支払う' : '自分が受け取る'}精算です。実際の立替と登録内容が合っているか確認してください。</p>{sameDirection.map(item => <p key={settlementKey(item)}>{item.eventName}：{direction(item.direction, task.person)} — {money(item.remaining!)}<br/><Link to={`/events/${item.eventId}/tickets/${item.receptionId}/edit#${item.applicationId}`}>このチケットの支払者・精算を確認</Link></p>)}</section>}
          <p><Link to={`/events/${source.eventId}/tickets/${source.receptionId}/edit#${source.applicationId}`}>相殺元の支払者・精算を確認</Link> ／ 通常支払いに切り替えて記録することもできます。</p>
        </>}
        {groups.map(group => {
          const count = group.items.filter(i => selected.includes(settlementKey(i))).length;
          return <section className="settlement-event" key={group.id}>
            <label className="ticket-check"><input type="checkbox" disabled={busy} checked={count === group.items.length} ref={el => { if (el) el.indeterminate = count > 0 && count < group.items.length; }} onChange={e => toggle(group.items, e.target.checked)}/><span><strong>{group.items[0].eventName}</strong><small>{source.direction === 'receive' ? '相手が立替' : '自分が立替'}：{money(group.items.reduce((sum, i) => sum + i.remaining!, 0))}</small></span></label>
            {group.items.length === 1 ? <p className="settlement-item-label">{group.items.some(i=>i.directionWarning) && "【精算方向の確認が必要】"}{group.items[0].label} ／ {task.person}さん ／ {direction(group.items[0].direction,task.person)} ／ 未精算・相殺に利用可能：{money(group.items[0].remaining!)}</p> : <details><summary>個別に選ぶ（{count}／{group.items.length}件）</summary>{group.items.map(item => <label className="ticket-check" key={settlementKey(item)}><input type="checkbox" disabled={busy} checked={selected.includes(settlementKey(item))} onChange={e => toggle([item], e.target.checked)}/><span>{item.directionWarning && "【精算方向の確認が必要】"}{item.label}<small>{task.person}さん ／ {direction(item.direction,task.person)} ／ 未精算・相殺に利用可能：{money(item.remaining!)}{item.deadline ? ` ／ 期限 ${item.deadline}` : ''}</small></span></label>)}</details>}
          </section>;
        })}
        <label className="form-field">相殺日<input type="date" required disabled={busy} value={offsetDate} onChange={e => { edit(); setOffsetDate(e.target.value); }}/></label>
        {calculation && <section className="settlement-calculation" aria-live="polite"><h3>相殺後の金額</h3><dl className="task-facts"><dt>相殺元の金額（{direction(source.direction, task.person)}）</dt><dd>{money(calculation.sourceAmount)}</dd><dt>相殺対象の合計</dt><dd>{money(calculation.targetAmount)}</dd><dt>実際に相殺される金額</dt><dd>{money(calculation.offsetAmount)}</dd><dt>相殺後の残額</dt><dd><strong>{money(calculation.remainingAmount)}</strong></dd><dt>残額の支払者 → 受取者</dt><dd><strong>{direction(calculation.remainingDirection, task.person)}</strong></dd></dl><p>{mode === 'offset' ? '相殺だけを記録します。差額があれば未精算のまま残ります。' : calculation.remainingAmount ? '差額の実際の授受まで記録します。' : '差額がないため、支払日・受取日の入力は不要です。'}</p></section>}
      </>}
      {(mode === 'normal' || (mode === 'combined' && !!calculation?.remainingAmount)) && <label className="form-field">{mode === 'normal' ? source.direction === 'pay' ? '支払日' : '受領日' : calculation?.remainingDirection === 'pay' ? '差額の支払日' : '差額の受取日'}<input type="date" required disabled={busy} value={cashDate} onChange={e => { edit(); setCashDate(e.target.value); }}/></label>}
      {mode === 'normal' && activeGroup && <p>差額の精算は上の相殺グループから記録してください。</p>}
      {mode === 'normal' && <p>{source.settlement.isSettled ? '日付を変更して保存できます。' : '実際に支払った日・受け取った日を入力してください。未精算残額をすべて精算済みにします。'}</p>}
      {review && calculation && <section className="settlement-confirm" role="region" aria-label="確定前の内容確認"><h3>この内容で記録します</h3><p>相手：{task.person}さん ／ 相殺日：{offsetDate}</p><ul>{[source, ...targets].map(i => <li key={settlementKey(i)}>{i.eventName} — {i.label}：{money(i.remaining!)}</li>)}</ul><p>相殺 {money(calculation.offsetAmount)} ／ 差額 {money(calculation.remainingAmount)}（{direction(calculation.remainingDirection, task.person)}）</p><p>{mode === 'combined' && calculation.remainingAmount ? `差額精算日：${cashDate}` : '実際の金銭授受は記録しません。'}</p><button type="button" className="secondary-button" disabled={busy} onClick={() => setReview(false)}>選択内容に戻る</button></section>}
      <button type="submit" disabled={(mode === 'normal' && !!activeGroup) || busy || source.total === undefined || (mode !== 'normal' && !calculation)}>{busy ? '保存中…' : mode === 'normal' ? source.settlement.isSettled ? '日付を保存' : '保存して完了' : review ? 'この内容で確定' : '内容を確認する'}</button>
    </form>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="secondary-button" onClick={() => { setSnapshot(read()); setReview(false); setError(''); onSaved(); }}>最新の内容を読み直す</button></div>}
    {histories.length > 0 && <section className="settlement-history"><h2>相殺履歴</h2>{histories.map(history => <History key={history.id} history={history} items={items} person={task.person}/>)}</section>}
  </section>;
}
function History({ history, items, person }: { history: SettlementOffset; items: SettlementItem[]; person: string }) {
  const current = history.allocations.map(a => items.find(i => settlementKey(i) === settlementKey(a)));
  const pending = current.some(i => !i || !i.settlement.isSettled);
  return <details className="settlement-event"><summary>{history.offsetDate} ／ 相殺 {money(history.offsetAmount)}<small>{history.status === 'cancelled' ? '相殺取消' : pending ? '残額の精算待ち' : '関連する精算は完了'}</small></summary>
    <p>相殺元 {money(history.sourceAmount)} ／ 相殺対象 {money(history.targetAmount)}</p><p>相殺時の差額：{money(history.remainingAmount)}（{direction(history.remainingDirection, person)}）</p>
    <p>{history.cashDate ? `差額精算日：${history.cashDate}` : '差額の金銭授受は記録されていません。'}</p>
    {history.allocations.map((a, index) => <div className="settlement-history-item" key={settlementKey(a)}><Link to={url(a)}>{a.eventName} — {a.label}</Link><p>相殺 {money(a.offset)} ／ 相殺確定時の金銭授受 {money(a.cash)} ／ 処理後の残額 {money(a.remaining)}</p><p>現在の未精算残額：{current[index]?.remaining === undefined ? '確認できません' : money(current[index]!.remaining!)}{current[index]?.settlement.settledDate ? ` ／ 支払・受取日 ${current[index]!.settlement.settledDate}` : ''}{current[index]?.settlement.offsetCompletedDate ? ` ／ 相殺完了日 ${current[index]!.settlement.offsetCompletedDate}` : ''}</p></div>)}
    <small>相殺ID：{history.id}<br/>作成日時：{history.createdAt}</small>
  </details>;
}
