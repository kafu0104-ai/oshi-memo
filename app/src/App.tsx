import NewTicketPage from "./pages/Ticket/NewTicketPage";
import ShoppingListPage from "./pages/Shopping/ShoppingListPage";
import NewShoppingMemoPage from "./pages/Shopping/NewShoppingMemoPage";
import ReceiptTasksPage from "./pages/Home/ReceiptTasksPage";
import CalendarSettingsPage from "./pages/Settings/CalendarSettingsPage";
import AuthCallbackPage from "./pages/Shared/AuthCallbackPage";
import PersonalSyncPage from "./pages/Settings/PersonalSyncPage";
import SharedShoppingPage from "./pages/Shared/SharedShoppingPage";
import { JoinShoppingPage } from "./pages/Shared/JoinRequests";
import { NavLink, Route, Routes } from "react-router";
import BackToTop from "./components/common/BackToTop";
import RouteScrollReset from "./components/common/RouteScrollReset";
import { OshiIcon } from "./components/common/OshiIcon";
import EventPage from "./pages/Event/EventPage";
import EventDetailPage from "./pages/Event/EventDetailPage";
import HomePage from "./pages/Home/HomePage";
import CompanionSettingsPage from "./pages/Settings/CompanionSettingsPage";
import TagSettingsPage from "./pages/Settings/TagSettingsPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import TicketEditPage from "./pages/Ticket/TicketEditPage";
import { AllTasksPage } from "./pages/Home/TicketTodos";
import TicketTaskPage, { CompletedTasksPage } from "./pages/Home/TicketTaskPage";
import TicketPage from "./pages/Ticket/TicketPage";

import ThemeSettingsPage from "./pages/Settings/ThemeSettingsPage";

import ShoppingPage from "./pages/Shopping/ShoppingPage";

import FeatureEventsPage from "./pages/Home/FeatureEventsPage";

import ExchangePage from "./pages/Exchange/ExchangePage";

function App() {
  return (
    <div className="app-shell">
      <RouteScrollReset />
      <Routes>
        <Route path="/settings/calendar" element={<CalendarSettingsPage />} />
        <Route path="/settings/sync" element={<PersonalSyncPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/shared" element={<SharedShoppingPage />} />
        <Route path="/shared/join" element={<JoinShoppingPage />} />
        <Route path="/shared/:roomId" element={<SharedShoppingPage />} />
        <Route path="/exchange" element={<ExchangePage />} />
        <Route path="/shopping" element={<ShoppingListPage />} />
        <Route path="/shopping/new" element={<NewShoppingMemoPage />} />
        <Route path="/shopping/:memoId" element={<ShoppingPage />} />
        <Route path="/tickets/new" element={<NewTicketPage />} />
        <Route path="/tickets" element={<FeatureEventsPage kind="tickets" />} />
        <Route path="/events/:eventId/shopping" element={<ShoppingPage />} />
        <Route path="/settings/theme" element={<ThemeSettingsPage />} />
        <Route path="/settings/companions" element={<CompanionSettingsPage />} />
        <Route path="/settings/tags" element={<TagSettingsPage />} />
        <Route path="/tasks" element={<AllTasksPage />} />
        <Route path="/tasks/receipts/:eventId" element={<ReceiptTasksPage />} />
        <Route path="/tasks/completed" element={<CompletedTasksPage />} />
        <Route path="/tasks/:ticketId/:receptionId/:applicationId/:taskId" element={<TicketTaskPage />} />
        <Route path="/events/:eventId/tickets/:receptionId/edit" element={<TicketEditPage />} />
        <Route path="/" element={<HomePage />} />

        <Route path="/events" element={<EventPage />} />

        <Route
          path="/events/:eventId"
          element={<EventDetailPage />}
        />

        <Route
          path="/events/:eventId/tickets"
          element={<TicketPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

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

      <BackToTop />

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
          <OshiIcon
            name="home"
            size={25}
          />
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
          <OshiIcon
            name="event"
            size={25}
          />
          <span>イベント</span>
        </NavLink>

        <NavLink to="/shopping" className={({isActive})=>isActive?"bottom-nav-link is-active":"bottom-nav-link"}><OshiIcon name="online-sale-genre" size={25}/><span>買い物メモ</span></NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive
              ? "bottom-nav-link is-active"
              : "bottom-nav-link"
          }
        >
          <OshiIcon
            name="settings"
            size={25}
          />
          <span>設定</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
