import { Link } from "react-router";
import { OshiIcon } from "../../components/common/OshiIcon";

const choices = [
  {to:"/events?new=1",icon:"event",name:"イベント",description:"ライブ・舞台・展示・カフェなど"},
  {to:"/shopping/new",icon:"shopping-memo",name:"買い物メモ",description:"グッズ・通販・予約商品"},
  {to:"/tickets/new",icon:"ticket",name:"チケット",description:"申込・当落・支払い"},
  {to:"/exchange?edit=new",icon:"exchange",name:"交換・譲渡",description:"グッズの交換・お取引"},
  {to:"/new/travel",icon:"travel",name:"遠征・旅行",description:"交通・宿泊・滞在の予定",pending:true},
  {to:"/new/pilgrimage",icon:"pilgrimage",name:"聖地巡礼",description:"作品ゆかりの場所をめぐる",pending:true},
  {to:"/new/daily",icon:"todo",name:"日常の予定・タスク",description:"予定・やることをまとめる",pending:true},
  {to:"/new/free",icon:"free-memo",name:"フリーメモ",description:"自由に残しておきたいこと",pending:true},
] as const;
export default function CreatePage() {
  return <main><header className="page-header"><h1>新規作成</h1></header>
    <nav className="home-feature-grid" aria-label="作成するメモの種類">{choices.map(choice=><Link key={choice.to} to={choice.to} className="home-feature-tile"><OshiIcon name={choice.icon} size={34}/><strong>{choice.name}</strong><span>{choice.description}</span>{"pending" in choice && <small className="creation-pending-badge">準備中</small>}</Link>)}</nav>
  </main>;
}
