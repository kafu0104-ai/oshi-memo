import { Link } from 'react-router';
import { OshiIcon } from '../../components/common/OshiIcon';
import HomeCalendar from './HomeCalendar';
export default function SchedulePage() {
 return <main className="schedule-page"><header className="page-header"><h1>予定</h1><Link className="schedule-settings" to="/settings/calendar" aria-label="カレンダーの色・文字の設定" title="色・文字の設定"><OshiIcon name="settings" size={24}/></Link></header><HomeCalendar/></main>;
}
