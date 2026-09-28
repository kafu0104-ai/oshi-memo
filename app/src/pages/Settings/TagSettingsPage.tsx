import { generateId } from "../../services/id";
import { useState } from "react";
import { Link } from "react-router";
import { loadTagRecords, saveTaskTags, TAG_COLORS, selectedTags } from "../../services/taskTags";
import { loadTickets } from "../../services/storage";
export default function TagSettingsPage() {
  const [tags, setTags] = useState(loadTagRecords);
  const [name, setName] = useState(""); const [palette, setPalette] = useState(5);
  const [editing, setEditing] = useState<string>(); const [message, setMessage] = useState("");
  function persist(next: typeof tags) { try { saveTaskTags(next); setTags(next); setMessage("タグを保存しました。"); return true; } catch { setMessage("保存できませんでした。"); return false; } }
  function count(id: string) {
    return loadTickets().reduce((n,t) => n + t.receptions.reduce((m,r) => m + r.applications.reduce((k,a) => {
      const p = a.fulfillment?.payment; if (!p) return k;
      return k + Number(selectedTags(p,"payment").includes(id)) + p.settlements.filter(s => selectedTags(s,s.direction === "pay" ? "payment" : "income").includes(id)).length;
    },0),0),0);
  }
  return <main><Link to="/settings">← 設定へ戻る</Link><h1>タグ管理</h1><p>タグの名前と配色を管理します。「重要」の優先機能は名前を変えても維持されます。</p>
    <form className="task-completion-form" onSubmit={e => { e.preventDefault(); const trimmed = name.trim(); if (!trimmed) return;
      if (tags.some(t => !t.deleted && t.id !== editing && t.name === trimmed)) { setMessage("同じ名前のタグがあります。"); return; }
      const next = editing ? tags.map(t => t.id === editing ? { ...t, name: trimmed, palette } : t) : [...tags, { id: generateId(), name: trimmed, palette }];
      if (persist(next)) { setName(""); setEditing(undefined); }
    }}><h2>{editing ? "タグを編集" : "タグを追加"}</h2><label className="form-field">タグ名<input required maxLength={20} value={name} onChange={e => setName(e.target.value)}/></label>
      <label className="form-field">配色<select value={palette} onChange={e => setPalette(Number(e.target.value))}>{TAG_COLORS.map((c,i) => <option key={c.name} value={i}>{c.name}</option>)}</select></label>
      <span className="task-tag" style={{background:TAG_COLORS[palette].background,color:TAG_COLORS[palette].color}}>{name || "プレビュー"}</span>
      <button type="submit">{editing ? "変更を保存" : "追加"}</button>{editing && <button type="button" onClick={() => { setEditing(undefined); setName(""); }}>キャンセル</button>}
    </form><p role="status">{message}</p><ul className="registered-companions">{tags.filter(t => !t.deleted).map(tag => <li key={tag.id}><span className="task-tag" style={{background:TAG_COLORS[tag.palette]?.background,color:TAG_COLORS[tag.palette]?.color}}>{tag.name}</span><button type="button" onClick={() => { setEditing(tag.id); setName(tag.name); setPalette(tag.palette); }}>編集</button><button type="button" onClick={() => {
      if (!window.confirm(`「${tag.name}」は${count(tag.id)}件で使用中です。タグを削除しますか？チケット情報やタスクは残ります。`)) return;
      if (persist(tags.map(t => t.id === tag.id ? {...t,deleted:true} : t)) && editing === tag.id) { setEditing(undefined); setName(""); }
    }}>削除</button></li>)}</ul>
  </main>;
}
