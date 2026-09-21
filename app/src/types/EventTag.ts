export interface EventTag {
  id: string;
  name: string;
  isDefault: boolean;
}

export const DEFAULT_EVENT_TAGS: EventTag[] = [
  {
    id: "goods-sale",
    name: "グッズ販売",
    isDefault: true,
  },
  {
    id: "live",
    name: "ライブ・コンサート",
    isDefault: true,
  },
  {
    id: "stage",
    name: "舞台・ミュージカル",
    isDefault: true,
  },
  {
    id: "movie",
    name: "映画・上映",
    isDefault: true,
  },
  {
    id: "talk",
    name: "トーク・ファンイベント",
    isDefault: true,
  },
  {
    id: "exhibition",
    name: "展示・展覧会",
    isDefault: true,
  },
  {
    id: "collaboration-food",
    name: "コラボ・飲食",
    isDefault: true,
  },
  {
    id: "online-sale",
    name: "通販・受注",
    isDefault: true,
  },
];