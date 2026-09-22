import { Link } from "react-router";
import { OshiIcon } from "../../components/common/OshiIcon";

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
        <div className="home-section-heading">
          <div>
            <h2 className="icon-heading">
              <OshiIcon name="todo" size={30} />
              <span>やることリスト</span>
            </h2>
          </div>
        </div>

        <div className="empty-card">
          <p>現在、対応が必要な項目はありません。</p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <h2 className="icon-heading">
              <OshiIcon name="schedule" size={30} />
              <span>今後の予定</span>
            </h2>

            <p>
              ライブ、ショップ、コラボなどの予定を確認できます。
            </p>
          </div>
        </div>

        <div className="home-event-link">
          <Link className="primary-link-button" to="/events">
            <OshiIcon name="event" size={22} />
            <span>イベント一覧を開く</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default HomePage;