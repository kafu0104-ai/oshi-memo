import HomeCalendar from "./HomeCalendar";
import { loadEvents } from "../../services/storage";
import { localToday } from "../../services/ticketTasks";
import { nextDate, upcomingEvents } from "../../services/upcomingEvents";
import TicketTodos from "./TicketTodos";
import { Link } from "react-router";
import { OshiIcon } from "../../components/common/OshiIcon";

function HomePage() {
  const today = localToday();
  const tomorrow = nextDate(today);
  const upcoming = upcomingEvents(loadEvents(), today);
  const features = [
    {to:"/events",icon:"event",name:"イベント",description:"予定を登録・確認"},
    {to:"/shopping",icon:"shopping-memo",name:"買い物メモ",description:"商品・数量・購入状況"},
    {to:"/tickets",icon:"ticket",name:"チケット",description:"申込・当落・支払い"},
    {to:"/exchange",icon:"exchange",name:"交換・譲渡",description:"グッズ・支払い・受け渡し"},
  ] as const;
  return <main className="home-dashboard">
    <header className="page-header home-brand"><div><h1>推しメモ</h1></div></header>
    <section className="home-announcement" aria-labelledby="home-tasks-heading">
      <h2 id="home-tasks-heading" className="icon-heading"><OshiIcon name="announcement" size={24}/><span>やることのお知らせ</span></h2>
      <TicketTodos />
    </section>
    <HomeCalendar />
    <nav className="home-feature-grid" aria-label="アプリの機能">
      {features.map(feature=><Link key={feature.to} to={feature.to} className="home-feature-tile"><OshiIcon name={feature.icon} size={34}/><strong>{feature.name}</strong><span>{feature.description}</span></Link>)}
    </nav>
    <section className="home-next-event" aria-labelledby="home-event-heading">
      <div className="home-next-heading"><h2 id="home-event-heading" className="icon-heading"><OshiIcon name="schedule" size={24}/><span>直近のイベント</span></h2><Link className="task-navigation-button" to="/events">すべて見る</Link></div>
      {upcoming.length===0 ? <p>今後のイベントはまだ登録されていません。</p> : upcoming.map(event=><Link className="upcoming-event" key={event.id} to={`/events/${event.id}`}><span className="upcoming-date">{event.startDate.replaceAll("-","/")}<small>{event.startDate===today?"今日":event.startDate===tomorrow?"明日":event.startDate<today?"開催中":""}</small></span><span><strong>{event.title}</strong>{event.venue&&<small>{event.venue}</small>}</span><span aria-hidden="true">›</span></Link>)}
    </section>
  </main>;
}
export default HomePage;
