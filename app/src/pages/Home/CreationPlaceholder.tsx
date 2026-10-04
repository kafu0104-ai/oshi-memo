import { Link, useParams } from 'react-router';
import { OshiIcon } from '../../components/common/OshiIcon';
const options = {
  travel: {name:'遠征・旅行', icon:'travel'},
  pilgrimage: {name:'聖地巡礼', icon:'pilgrimage'},
  daily: {name:'日常の予定・タスク', icon:'todo'},
  free: {name:'フリーメモ', icon:'free-memo'},
} as const;
export default function CreationPlaceholder() {
  const {kind} = useParams();
  const option = options[kind as keyof typeof options];
  return <main><header className="page-header"><h1>{option?.name ?? '新規作成'}</h1></header><section className="creation-placeholder">
    {option && <OshiIcon name={option.icon} size={42}/>}
    <h2>準備中</h2><p>このメモの作成機能は、これから追加予定です。</p>
    <Link className="task-navigation-button" to="/new">新規作成に戻る</Link>
  </section></main>;
}
