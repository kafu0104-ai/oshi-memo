import { NavLink, Route, Routes } from "react-router";
import { OshiIcon } from "./components/common/OshiIcon";
import EventPage from "./pages/Event/EventPage";
import EventDetailPage from "./pages/Event/EventDetailPage";
import HomePage from "./pages/Home/HomePage";
import SettingsPage from "./pages/Settings/SettingsPage";

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventPage />} />
        <Route
          path="/events/:eventId"
          element={<EventDetailPage />}
        />
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

      <nav
        className="bottom-navigation"
        aria-label="メインナビゲーション"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive
              ? "bottom-nav-link is-active"
              : "bottom-nav-link"
          }
        >
          <OshiIcon name="home" size={25} />
          <span>ホーム</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) =>
            isActive
              ? "bottom-nav-link is-active"
              : "bottom-nav-link"
          }
        >
          <OshiIcon name="event" size={25} />
          <span>イベント</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive
              ? "bottom-nav-link is-active"
              : "bottom-nav-link"
          }
        >
          <OshiIcon name="settings" size={25} />
          <span>設定</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;