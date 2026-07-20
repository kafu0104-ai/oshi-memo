import { useEffect, useState } from 'react'
import './App.css'

type EventItem = {
  id: string
  name: string
  date: string
  productCount: number
  purchaserCount: number
  bonusCount: number
}

const initialEvents: EventItem[] = [
  {
    id: 'event-1',
    name: 'うたプリ GRAND SHOP',
    date: '2026-07-18',
    productCount: 28,
    purchaserCount: 4,
    bonusCount: 9,
  },
  {
    id: 'event-2',
    name: '文豪ストレイドッグス10周年',
    date: '2026-04-26',
    productCount: 12,
    purchaserCount: 2,
    bonusCount: 4,
  },
]

function loadEvents(): EventItem[] {
  const savedEvents = localStorage.getItem('oshimemo-events')

  if (!savedEvents) {
    return initialEvents
  }

  try {
    return JSON.parse(savedEvents) as EventItem[]
  } catch {
    return initialEvents
  }
}

function formatDate(date: string) {
  if (!date) {
    return '日付未設定'
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function App() {
  const [events, setEvents] = useState<EventItem[]>(loadEvents)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null

  useEffect(() => {
    localStorage.setItem('oshimemo-events', JSON.stringify(events))
  }, [events])

  const closeForm = () => {
    setIsFormOpen(false)
    setEventName('')
    setEventDate('')
  }

  const createEvent = () => {
    const trimmedName = eventName.trim()

    if (!trimmedName) {
      return
    }

    const newEvent: EventItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      date: eventDate,
      productCount: 0,
      purchaserCount: 1,
      bonusCount: 0,
    }

    setEvents((currentEvents) => [newEvent, ...currentEvents])
    closeForm()
  }

  if (selectedEvent) {
    return (
      <main className="app-shell">
        <div className="page-container">
          <header className="detail-header">
            <button
              type="button"
              className="back-button"
              onClick={() => setSelectedEventId(null)}
            >
              ← ホームへ戻る
            </button>

            <button
              type="button"
              className="icon-button"
              aria-label="イベント設定"
            >
              ⚙
            </button>
          </header>

          <section className="event-hero">
            <p className="event-date">{formatDate(selectedEvent.date)}</p>

            <h1>{selectedEvent.name}</h1>

            <p className="event-description">
              イベントのお買い物情報をまとめて管理します。
            </p>
          </section>

          <section className="summary-grid">
            <article className="summary-card">
              <span className="summary-icon">🛍️</span>
              <p>登録商品</p>
              <strong>{selectedEvent.productCount}</strong>
              <span>件</span>
            </article>

            <article className="summary-card">
              <span className="summary-icon">👥</span>
              <p>購入者</p>
              <strong>{selectedEvent.purchaserCount}</strong>
              <span>人</span>
            </article>

            <article className="summary-card">
              <span className="summary-icon">🎁</span>
              <p>特典</p>
              <strong>{selectedEvent.bonusCount}</strong>
              <span>枚</span>
            </article>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="section-label">EVENT MENU</p>
                <h2>イベント管理</h2>
              </div>
            </div>

            <div className="menu-grid">
              <button type="button" className="menu-card">
                <span className="menu-icon">🛍️</span>
                <span>
                  <strong>商品一覧</strong>
                  <small>商品情報と購入数を管理</small>
                </span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="menu-card">
                <span className="menu-icon">👤</span>
                <span>
                  <strong>購入者</strong>
                  <small>購入者ごとのメモを確認</small>
                </span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="menu-card">
                <span className="menu-icon">🎀</span>
                <span>
                  <strong>特典設定</strong>
                  <small>配布条件と枚数を管理</small>
                </span>
                <span className="menu-arrow">›</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <div className="page-container">
        <header className="home-header">
          <div>
            <p className="eyebrow">生きる活力チャージ</p>
            <h1 className="app-title">OshiMemo</h1>
          </div>

          <button type="button" className="icon-button" aria-label="設定">
            ⚙
          </button>
        </header>

        <button
          type="button"
          className="create-banner"
          onClick={() => setIsFormOpen(true)}
        >
         <span className="create-banner-icon" aria-hidden="true">
          ＋
        </span>

        <span className="create-banner-text">
          新しい買い物メモを作成
        </span>

  <span className="create-banner-arrow" aria-hidden="true">
    ›
  </span>
</button>

        <section className="saved-events">
          <div className="section-heading">
              <h2>保存したメモ</h2>

            <span className="event-count">{events.length}件</span>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              <span>🤍</span>
              <h3>まだイベントはありません</h3>
              <p>新しいイベントを作成して、推し活の準備を始めましょう。</p>
            </div>
          ) : (
            <div className="event-list">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="event-card"
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="event-card-main">
                    <p className="event-card-date">
                      {formatDate(event.date)}
                    </p>

                    <h3>{event.name}</h3>

                    <div className="event-meta">
                      <span>🛍️ 商品 {event.productCount}件</span>
                      <span>👥 購入者 {event.purchaserCount}人</span>
                      <span>🎁 特典 {event.bonusCount}枚</span>
                    </div>
                  </div>

                  <span className="event-arrow">›</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <section
            className="event-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-event-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <h2 id="new-event-title">新しいイベント</h2>
              <span>
                イベント名と開催日を入力してください。
              </span>
            </div>

            <label className="form-field">
              <span>イベント名</span>

              <input
                type="text"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                placeholder="例：うたプリ GRAND SHOP"
                autoFocus
              />
            </label>

            <label className="form-field">
              <span>開催日</span>

              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
              >
                キャンセル
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={createEvent}
                disabled={!eventName.trim()}
              >
                作成
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App