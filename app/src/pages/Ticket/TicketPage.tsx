import { OshiIcon } from "../../components/common/OshiIcon";

function TicketPage() {
  return (
    <main className="page-container">
      <section className="page-card">
        <header className="page-header">
          <p className="page-eyebrow">TICKET</p>

          <h1>チケット・申込</h1>

          <p className="page-description">
            先行・申込・当落・支払い・発券・分配・座席まで、
            イベントのチケット情報をまとめて管理します。
          </p>
        </header>

        <section>
          <div className="event-detail-section-heading">
            <p className="page-eyebrow">RECEPTION</p>
            <h2>受付情報</h2>
          </div>

          <div className="event-module-empty">
            <OshiIcon
              name="ticket"
              size={32}
              alt=""
            />

            <h3>受付はまだ登録されていません</h3>

            <p>
              FC先行・シリアル先行・一般販売など、
              チケットの受付情報を登録できます。
            </p>

            <button
              type="button"
              className="event-module-button"
            >
              <OshiIcon
                name="add"
                size={18}
                alt=""
              />
              <span>受付を追加</span>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default TicketPage;