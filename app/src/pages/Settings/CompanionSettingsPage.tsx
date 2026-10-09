import { generateId } from "../../services/id";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { loadCompanions, loadTickets, saveCompanion } from "../../services/storage";

export default function CompanionSettingsPage() {
  const [companions, setCompanions] = useState(loadCompanions);
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function reset() { setEditing(undefined); setName(""); setMemo(""); }
  function uses(id: string) {
    return loadTickets().reduce((n,t) => n + t.receptions.reduce((m,r) => m + r.applications.filter(a => a.companionIds.includes(id) || a.fulfillment?.payment.payerId === id || a.fulfillment?.payment.settlements.some(s => s.companionId === id) || a.fulfillment?.distributions.some(d => d.companionId === id) || a.fulfillment?.seatAssignments.some(s => s.holderId === id)).length,0),0);
  }
  return <main><Link to="/settings">← 設定・管理へ戻る</Link><h1>同行者管理</h1><p>名前・ニックネームとメモを管理できます。名前の変更は、登録済みのチケットや精算にも反映されます。</p>
    <form className="task-completion-form" onSubmit={e => {
      e.preventDefault(); const trimmed = name.trim();
      if (!trimmed) { setMessage("名前を入力してください。"); return; }
      const current = loadCompanions();
      if (current.some(c => c.id !== editing && c.name.trim() === trimmed)) { setMessage("同じ名前の人がすでに登録されています。"); window.alert("同じ名前の人がすでに登録されています。"); return; }
      const existing = current.find(c => c.id === editing);
      if (editing && (!existing || existing.deleted)) { setMessage("編集対象が見つかりません。再読み込みしてください。"); return; }
      try {
        const now = new Date().toISOString();
        saveCompanion({ ...existing, id: existing?.id ?? generateId(), name: trimmed, memo: memo.trim() || undefined, createdAt: existing?.createdAt ?? now, updatedAt: now });
        setCompanions(loadCompanions()); reset(); setMessage(editing ? "同行者を更新しました。" : "同行者を追加しました。");
      } catch { setMessage("保存できませんでした。入力内容は残しています。"); }
    }}><h2>{editing ? "同行者を編集" : "同行者を追加"}</h2>
      <label className="form-field">名前・ニックネーム<input ref={input} required maxLength={50} value={name} onChange={e => setName(e.target.value)}/></label>
      <label className="form-field">メモ（任意）<textarea rows={3} value={memo} onChange={e => setMemo(e.target.value)}/></label>
      <div className="form-actions">{editing && <button type="button" className="secondary-button" onClick={reset}>キャンセル</button>}<button type="submit">{editing ? "変更を保存" : "追加"}</button></div>
    </form>
    <p role="status">{message}</p><h2>登録済みの同行者</h2>
    {companions.filter(c => !c.deleted).length === 0 && <p>同行者はまだ登録されていません。</p>}
    <ul className="registered-companions">{companions.filter(c => !c.deleted).map(c => <li key={c.id}>
      <div className="companion-management-info"><strong>{c.name}</strong>{c.memo && <p>{c.memo}</p>}</div>
      <button type="button" className="secondary-button" aria-label={`${c.name}を編集`} onClick={() => { setEditing(c.id); setName(c.name); setMemo(c.memo ?? ""); input.current?.focus(); }}>編集</button>
      <button type="button" className="secondary-button" aria-label={`${c.name}を削除`} onClick={() => {
        if (!window.confirm(`${c.name}さんは${uses(c.id)}件の申込で使用中です。一覧から削除しますか？登録済みのチケット・精算の名前と履歴は残ります。`)) return;
        try { const latest = loadCompanions().find(item => item.id === c.id); if (!latest) throw new Error(); saveCompanion({ ...latest, deleted: true, updatedAt: new Date().toISOString() }); setCompanions(loadCompanions()); if (editing === c.id) reset(); setMessage("同行者を一覧から削除しました。登録済みの履歴は残っています。"); } catch { setMessage("削除できませんでした。"); }
      }}>削除</button>
    </li>)}</ul>
  </main>;
}
