import { Link } from "react-router";

function HomePage() {
  return (
    <main>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">OSHI-MEMO</p>
          <h1>推しメモ</h1>
          <p>推し活で「あ、忘れてた…」をなくすアプリ。</p>
        </div>
      </header>

      <section className="home-section">
        <h2>やることリスト</h2>

        <div className="empty-card">
          <p>現在、対応が必要な項目はありません。</p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <h2>イベント</h2>
            <p>ライブ、ショップ、コラボなどを管理します。</p>
          </div>

          <Link className="text-link" to="/events">
            すべて見る
          </Link>
        </div>

        <Link className="primary-link-button" to="/events">
          イベント一覧を開く
        </Link>
      </section>
    </main>
  );
}

export default HomePage;