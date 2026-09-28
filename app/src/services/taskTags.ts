export const TAG_COLORS = [
  { name: "ローズ", background: "#995D6B", color: "#FFFFFF" },
  { name: "アプリコット", background: "#F3D8BF", color: "#544C40" },
  { name: "ブルー", background: "#D7E5EE", color: "#544C40" },
  { name: "ラベンダー", background: "#E4DBEF", color: "#544C40" },
  { name: "セージ", background: "#DCE6D7", color: "#544C40" },
  { name: "ベージュ", background: "#E8E3DE", color: "#544C40" },
  { name: "ピンク", background: "#F1DCE1", color: "#544C40" },
];
export interface TaskTag { id: string; name: string; palette: number; deleted?: boolean }
const KEY = "oshi-memo-task-tags";
const defaults: TaskTag[] = ["重要", "支払い", "入金確認", "発送", "受取確認", "手渡し", "連絡"].map((name, palette) => ({ id: ["important","payment","income","shipping","receipt","handover","contact"][palette], name, palette }));
export function loadTagRecords(): TaskTag[] {
  const value = localStorage.getItem(KEY);
  if (!value) return defaults.map(t => ({ ...t }));
  try { const tags = JSON.parse(value); return Array.isArray(tags) ? tags : defaults; } catch { return defaults; }
}
export const loadTaskTags = () => loadTagRecords().filter(t => !t.deleted);
export function saveTaskTags(tags: TaskTag[]) { localStorage.setItem(KEY, JSON.stringify(tags)); }
export function selectedTags(record: { tagIds?: string[]; important?: boolean }, defaultId: string): string[] {
  const available = new Set(loadTaskTags().map(t => t.id));
  return (record.tagIds ?? [defaultId, ...(record.important ? ["important"] : [])]).filter(id => available.has(id));
}
