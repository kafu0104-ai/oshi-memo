import { Link } from "react-router";
function SettingsPage() {
  return (
    <main>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">SETTINGS</p>
          <h1>設定・管理</h1>
          <p>推しメモの表示やデータ管理を設定します。</p>
        </div>
      </header>

      <section className="management-links" aria-label="管理メニュー">
        <Link className="management-card" to="/settings/sync"><strong>自分の端末と同期</strong><span>イベント・チケット・買い物メモ・設定をPCとスマホで引き継ぐ</span><span aria-hidden="true">›</span></Link>
        <Link className="management-card" to="/shared"><strong>友人との共有・ログイン</strong><span>共有中の買い物メモ・招待の管理</span><span aria-hidden="true">›</span></Link>
        <Link className="management-card" to="/settings/theme"><strong>テーマカラー</strong><span>好きなキャラクターの配色に切り替え</span><span aria-hidden="true">›</span></Link>
        <Link className="management-card" to="/settings/tags"><strong>タグ管理</strong><span>タグの追加・名前や色の編集・削除</span><span aria-hidden="true">›</span></Link>
        <Link className="management-card" to="/settings/companions"><strong>同行者管理</strong><span>同行者の追加・名前やメモの編集・削除</span><span aria-hidden="true">›</span></Link>
        <Link className="management-card" to="/tasks/completed"><strong>アーカイブ（完了済みタスク）</strong><span>完了したタスクや支払日などの履歴を確認</span><span aria-hidden="true">›</span></Link>
      </section>
    </main>
  );
}

export default SettingsPage;
