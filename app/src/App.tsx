import { loadEvents, saveEvents } from "./services/storage";
import type { Event } from "./types/Event";

function App() {
  const handleSave = () => {
    const events: Event[] = [
      {
        id: crypto.randomUUID(),
        title: "うたプリ グランドショップ",
        date: "2026-07-25",
        venue: "池袋",
        memo: "テストデータ",
      },
    ];

    saveEvents(events);

    alert("保存しました！");
  };

  const handleLoad = () => {
    console.log(loadEvents());
    alert("コンソールを確認してください！");
  };

  return (
    <main>
      <h1>推しメモ</h1>
      <p>推し活で「あ、忘れてた…」をなくすアプリ。</p>

      <br />

      <button onClick={handleSave}>保存</button>

      <button
        onClick={handleLoad}
        style={{ marginLeft: "12px" }}
      >
        読み込み
      </button>
    </main>
  );
}

export default App;