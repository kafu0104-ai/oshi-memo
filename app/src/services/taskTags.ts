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
defaults.push({ id: "settlement", name: "精算", palette: 3 },
  { id: "application", name: "申込", palette: 1 },
  { id: "result", name: "当落確認", palette: 2 },
  { id: "issuance", name: "発券", palette: 4 });
export function loadTagRecords(): TaskTag[] {
  const value = localStorage.getItem(KEY);
  if (!value) return defaults.map(t => ({ ...t }));
  try { const tags = JSON.parse(value); return Array.isArray(tags) ? [...tags, ...defaults.filter(t => ["settlement", "application", "result", "issuance"].includes(t.id) && !tags.some(existing => existing.id === t.id))] : defaults; } catch { return defaults; }
}
export const loadTaskTags = () => loadTagRecords().filter(t => !t.deleted);
export function saveTaskTags(tags: TaskTag[]) { localStorage.setItem(KEY, JSON.stringify(tags)); }
export function selectedTags(record: { tagIds?: string[]; important?: boolean }, defaultId: string): string[] {
  // Upgrade only the former standard settlement combinations; keep custom choices.
  if (defaultId === "settlement" && record.tagIds?.some(id => id === "income" || id === "payment") && record.tagIds.every(id => ["income", "payment", "important"].includes(id))) {
    record = { ...record, tagIds: [...new Set(record.tagIds.map(id => id === "income" || id === "payment" ? "settlement" : id))] };
  }
  const available = new Set(loadTaskTags().map(t => t.id));
  return (record.tagIds ?? [defaultId, ...(record.important ? ["important"] : [])]).filter(id => available.has(id));
}
