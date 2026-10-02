import { useState } from "react";
import { loadTaskTags, TAG_COLORS } from "../../services/taskTags";
export function TaskTags({ ids }: { ids: string[] }) {
  const tags = loadTaskTags();
  return <span className="task-tag-list">{ids.map(id => {
    const tag = tags.find(t => t.id === id); if (!tag) return null;
    const colors = TAG_COLORS[tag.palette] ?? TAG_COLORS[5];
    return <span className="task-tag" key={id} style={{ background: colors.background, color: colors.color }}>{tag.name}</span>;
  })}</span>;
}
export function TagPicker({ value, onChange, preferredIds }: { value: string[]; onChange: (ids: string[]) => void; preferredIds?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const tags = loadTaskTags();
  const priority = new Set(["important", ...(preferredIds ?? tags.map(t=>t.id))]);
  const order = [...priority];
  const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
  const primary = tags.filter(t=>priority.has(t.id) || value.includes(t.id)).sort((a,b)=>rank(a.id)-rank(b.id));
  const others = tags.filter(t=>!primary.includes(t));
  const options = (items: typeof tags) => items.map(tag => <label key={tag.id}><input type="checkbox" checked={value.includes(tag.id)} onChange={e => onChange(e.target.checked ? [...value, tag.id] : value.filter(id => id !== tag.id))}/><TaskTags ids={[tag.id]} /></label>);
  return <fieldset className="tag-picker"><legend>タグ</legend><div>{options(primary)}</div>
    {others.length>0 && <><button type="button" className="secondary-button tag-picker-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?"ほかのタグを閉じる":"ほかのタグ"}</button>{expanded&&<div>{options(others)}</div>}</>}
    <small>外してもタスクは消えません。「重要」は表示の優先順位に反映されます。</small></fieldset>;
}
