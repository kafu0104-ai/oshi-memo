// Colors from https://sp.utapri.com/ipfduo/assets/css/style_0926.css?1
export const themes = [
  {
    "id": "otoya",
    "name": "一十木音也",
    "first": "#e84630",
    "second": "#ffe927",
    "group": "ST☆RISH"
  },
  {
    "id": "masato",
    "name": "聖川真斗",
    "first": "#546db2",
    "second": "#7fcdf3",
    "group": "ST☆RISH"
  },
  {
    "id": "natsuki",
    "name": "四ノ宮那月",
    "first": "#fed900",
    "second": "#c0d743",
    "group": "ST☆RISH"
  },
  {
    "id": "tokiya",
    "name": "一ノ瀬トキヤ",
    "first": "#91519b",
    "second": "#d5bb43",
    "group": "ST☆RISH"
  },
  {
    "id": "ren",
    "name": "神宮寺レン",
    "first": "#f19200",
    "second": "#af6ca9",
    "group": "ST☆RISH"
  },
  {
    "id": "syo",
    "name": "来栖 翔",
    "first": "#ec74a3",
    "second": "#90d1e0",
    "group": "ST☆RISH"
  },
  {
    "id": "cecil",
    "name": "愛島セシル",
    "first": "#a9cc17",
    "second": "#f8bd22",
    "group": "ST☆RISH"
  },
  {
    "id": "reiji",
    "name": "寿 嶺二",
    "first": "#29b37a",
    "second": "#f5bed5",
    "group": "QUARTET NIGHT"
  },
  {
    "id": "ranmaru",
    "name": "黒崎蘭丸",
    "first": "#af3b49",
    "second": "#7b9fd2",
    "group": "QUARTET NIGHT"
  },
  {
    "id": "ai",
    "name": "美風 藍",
    "first": "#b69bc7",
    "second": "#fff481",
    "group": "QUARTET NIGHT"
  },
  {
    "id": "camus",
    "name": "カミュ",
    "first": "#a8d4f1",
    "second": "#f1dfbb",
    "group": "QUARTET NIGHT"
  },
  {
    "id": "eiichi",
    "name": "鳳 瑛一",
    "first": "#e84630",
    "second": "#a5368d",
    "group": "HE★VENS"
  },
  {
    "id": "kira",
    "name": "皇 綺羅",
    "first": "#546db2",
    "second": "#fff11d",
    "group": "HE★VENS"
  },
  {
    "id": "nagi",
    "name": "帝 ナギ",
    "first": "#fed900",
    "second": "#f2a9c8",
    "group": "HE★VENS"
  },
  {
    "id": "eiji",
    "name": "鳳 瑛二",
    "first": "#91519b",
    "second": "#56c2e4",
    "group": "HE★VENS"
  },
  {
    "id": "van",
    "name": "桐生院ヴァン",
    "first": "#f19200",
    "second": "#0097db",
    "group": "HE★VENS"
  },
  {
    "id": "yamato",
    "name": "日向大和",
    "first": "#ec74a3",
    "second": "#9bd0ac",
    "group": "HE★VENS"
  },
  {
    "id": "shion",
    "name": "天草シオン",
    "first": "#a9cc17",
    "second": "#b5c7e5",
    "group": "HE★VENS"
  }
] as const;
const key = "oshi-memo-theme";
export function loadTheme(): string {
  try { const id = localStorage.getItem(key); return themes.some(t => t.id === id) ? id! : "standard"; }
  catch { return "standard"; }
}
const tint = (hex: string, opacity: number) => {
  const rgb = [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*opacity+255*(1-opacity)));
  return `rgb(${rgb.join(",")})`;
};
const variables = ["background", "primary", "primary-dark", "primary-soft", "theme-glow", "theme-secondary"];
export function applyTheme(id: string) {
  const theme = themes.find(t => t.id === id);
  const style = document.documentElement.style;
  variables.forEach(name => style.removeProperty(`--color-${name}`));
  if (!theme) return;
  const colors = [tint(theme.first,.08), tint(theme.first,.3), tint(theme.first,.4), tint(theme.first,.15), tint(theme.second,.3), tint(theme.second,.3)];
  variables.forEach((name,i) => style.setProperty(`--color-${name}`, colors[i]));
}
export function saveTheme(id: string) {
  localStorage.setItem(key,id);
  applyTheme(id);
}
