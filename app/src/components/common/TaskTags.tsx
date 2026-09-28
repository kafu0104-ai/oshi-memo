import { loadTaskTags, TAG_COLORS } from "../../services/taskTags";
export function TaskTags({ ids }: { ids: string[] }) {
  const tags = loadTaskTags();
  return <span className="task-tag-list">{ids.map(id => {
    const tag = tags.find(t => t.id === id); if (!tag) return null;
    const colors = TAG_COLORS[tag.palette] ?? TAG_COLORS[5];
    return <span className="task-tag" key={id} style={{ background: colors.background, color: colors.color }}>{tag.name}</span>;
  })}</span>;
}
export function TagPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className="tag-picker"><legend>タグ</legend><div>{loadTaskTags().map(tag => <label key={tag.id}><input type="checkbox" checked={value.includes(tag.id)} onChange={e => onChange(e.target.checked ? [...value, tag.id] : value.filter(id => id !== tag.id))}/><TaskTags ids={[tag.id]} /></label>)}</div><small>外してもタスクは消えません。「重要」は表示の優先順位に反映されます。</small></fieldset>;
}
