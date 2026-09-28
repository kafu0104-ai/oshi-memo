import { useState } from "react";
import { Link } from "react-router";
import { loadTheme, saveTheme, themes } from "../../services/themes";

export default function ThemeSettingsPage() {
  const [selected, setSelected] = useState(loadTheme);
  const [message, setMessage] = useState("");
  function choose(id: string, name: string) {
    try { saveTheme(id); setSelected(id); setMessage(`${name}の配色に変更しました。`); }
    catch { setMessage("保存できませんでした。ブラウザの保存設定を確認してください。"); }
  }
  const options = [{ id: "standard", name: "標準", first: "#E4C1B5", second: "#E8E3DE", group: "標準" }, ...themes];
  return <main>
    <Link to="/settings">← 設定・管理へ戻る</Link>
    <header className="page-header"><div><p className="page-eyebrow">THEME COLOR</p><h1>テーマカラー</h1><p>好きな配色を選ぶと、その場で切り替わります。次回も選んだテーマで開きます。</p><p>背景やボタンをやさしい色合いに。タグの色はそのままです。</p></div></header>
    <p role="status">{message || `現在のテーマ：${options.find(t => t.id === selected)?.name}`}</p>
    { ["標準", "ST☆RISH", "QUARTET NIGHT", "HE★VENS"].map(group => <section key={group} className="theme-section" aria-label={group}>
      <h2>{group}</h2><div className="theme-options">
        {options.filter(t => t.group === group).map(theme => <button type="button" key={theme.id} className="theme-option" aria-pressed={selected === theme.id} onClick={() => choose(theme.id,theme.name)}>
          <span className="theme-swatches" aria-hidden="true"><span style={{background:theme.first}} /><span style={{background:theme.second}} /></span>
          <strong>{theme.name}</strong><span className="theme-choice-state">{selected === theme.id ? "✓ 選択中" : "この配色にする"}</span>
        </button>)}
      </div>
    </section>)}
  </main>;
}
