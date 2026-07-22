import { NavLink, Route, Routes } from "react-router";
import EventPage from "./pages/Event/EventPage";
import HomePage from "./pages/Home/HomePage";
import SettingsPage from "./pages/Settings/SettingsPage";

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <main>
              <header className="page-header">
                <h1>ページが見つかりません</h1>
                <p>指定されたページは存在しません。</p>
              </header>
            </main>
          }
        />
      </Routes>

      <nav className="bottom-navigation" aria-label="メインナビゲーション">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "bottom-nav-link is-active" : "bottom-nav-link"
          }
        >
          <span aria-hidden="true">⌂</span>
          <span>ホーム</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) =>
            isActive ? "bottom-nav-link is-active" : "bottom-nav-link"
          }
        >
          <span aria-hidden="true">♡</span>
          <span>イベント</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "bottom-nav-link is-active" : "bottom-nav-link"
          }
        >
          <span aria-hidden="true">⚙</span>
          <span>設定</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;