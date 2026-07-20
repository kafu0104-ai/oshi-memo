{isFormOpen && (
  <div
    role="presentation"
    onClick={() => setIsFormOpen(false)}
    style={{
      position: 'fixed',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      padding: '20px',
      background: 'rgba(60, 52, 47, 0.35)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-event-title"
      onClick={(event) => event.stopPropagation()}
      style={{
        boxSizing: 'border-box',
        width: 'min(440px, 100%)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '24px',
        background: '#fffdfb',
        boxShadow: '0 24px 70px rgba(60, 52, 47, 0.22)',
      }}
    >
      <h2
        id="new-event-title"
        style={{
          margin: 0,
          color: '#544c40',
          fontSize: '22px',
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        新しいイベント
      </h2>

      <p
        style={{
          margin: '8px 0 24px',
          color: '#8a7f76',
          fontSize: '14px',
          lineHeight: 1.7,
        }}
      >
        イベント名と開催日を入力してください。
      </p>

      <label
        style={{
          display: 'grid',
          gap: '8px',
          marginBottom: '18px',
          color: '#544c40',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        イベント名

        <input
          value={eventName}
          onChange={(event) => setEventName(event.target.value)}
          placeholder="例：うたプリ GRAND SHOP"
          autoFocus
          style={{
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
            padding: '14px 16px',
            border: '1px solid #ddd2cb',
            borderRadius: '14px',
            background: '#ffffff',
            color: '#544c40',
            font: 'inherit',
            outline: 'none',
          }}
        />
      </label>

      <label
        style={{
          display: 'grid',
          gap: '8px',
          color: '#544c40',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        開催日

        <input
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
            padding: '14px 16px',
            border: '1px solid #ddd2cb',
            borderRadius: '14px',
            background: '#ffffff',
            color: '#544c40',
            font: 'inherit',
            outline: 'none',
          }}
        />
      </label>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '28px',
        }}
      >
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          style={{
            padding: '12px 18px',
            border: '1px solid #ddd2cb',
            borderRadius: '999px',
            background: '#ffffff',
            color: '#6f655d',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          キャンセル
        </button>

        <button
          type="button"
          onClick={createEvent}
          disabled={!eventName.trim()}
          style={{
            padding: '12px 20px',
            border: 0,
            borderRadius: '999px',
            background: eventName.trim() ? '#e4c1b5' : '#e5dfdb',
            color: eventName.trim() ? '#544c40' : '#aaa19b',
            fontWeight: 700,
            cursor: eventName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          作成
        </button>
      </div>
    </section>
  </div>
)}