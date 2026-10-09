export const TAG_COLORS = [
  { name: "ローズ", background: "#8C646E", color: "#FFFFFF" },
  { name: "ベージュ", background: "#F2E8DF", color: "#593718" },
  { name: "ブルー", background: "#E4EAF2", color: "#593718" },
  { name: "ラベンダー", background: "#E4DBEF", color: "#593718" },
  { name: "セージ", background: "#CCD9CF", color: "#593718" },
  { name: "グレージュ", background: "#D9D5D2", color: "#593718" },
  { name: "ピンク", background: "#F2DFEB", color: "#593718" },
];
export interface TaskTag { id: string; name: string; palette: number; deleted?: boolean; paletteVersion?: number }
const KEY = "oshi-memo-task-tags";
const defaults: TaskTag[] = ["重要", "支払い", "入金確認", "発送", "受取確認", "手渡し", "連絡"].map((name, palette) => ({ id: ["important","payment","income","shipping","receipt","handover","contact"][palette], name, palette }));
defaults.push({ id: "settlement", name: "精算", palette: 3 },
  { id: "application", name: "申込", palette: 1 },
  { id: "result", name: "当落確認", palette: 2 },
  { id: "issuance", name: "発券", palette: 4 });
const defaultPalettes: Record<string, number> = {
  important: 0, payment: 1, income: 1, settlement: 1,
  application: 2, result: 2, issuance: 2,
  shipping: 4, receipt: 4, handover: 4, contact: 6, offset: 5,
};
const formerPalettes = Object.fromEntries(defaults.map(tag => [tag.id, tag.palette]));
for (const tag of defaults) { tag.palette = defaultPalettes[tag.id]; tag.paletteVersion = 1; }
defaults.push({ id: "offset", name: "相殺", palette: 5, paletteVersion: 1 });
function upgradePalette(tag: TaskTag): TaskTag {
  if (tag.paletteVersion === 1) return tag;
  return { ...tag, palette: tag.palette === formerPalettes[tag.id] ? defaultPalettes[tag.id] : tag.palette, paletteVersion: 1 };
}
export function loadTagRecords(): TaskTag[] {
  const value = localStorage.getItem(KEY);
  if (!value) return defaults.map(t => ({ ...t }));
  try { const tags = JSON.parse(value); return Array.isArray(tags) ? [...tags.map(upgradePalette), ...defaults.filter(t => ["settlement", "application", "result", "issuance", "offset"].includes(t.id) && !tags.some(existing => existing.id === t.id))] : defaults; } catch { return defaults; }
}
export const loadTaskTags = () => loadTagRecords().filter(t => !t.deleted);
export function saveTaskTags(tags: TaskTag[]) { localStorage.setItem(KEY, JSON.stringify(tags.map(tag => ({ ...tag, paletteVersion: 1 })))); }
export function selectedTags(record: { tagIds?: string[]; important?: boolean }, defaultId: string): string[] {
  // Upgrade only the former standard settlement combinations; keep custom choices.
  if (defaultId === "settlement" && record.tagIds?.some(id => id === "income" || id === "payment") && record.tagIds.every(id => ["income", "payment", "important"].includes(id))) {
    record = { ...record, tagIds: [...new Set(record.tagIds.map(id => id === "income" || id === "payment" ? "settlement" : id))] };
  }
  const available = new Set(loadTaskTags().map(t => t.id));
  return (record.tagIds ?? [defaultId, ...(record.important ? ["important"] : [])]).filter(id => available.has(id));
}
