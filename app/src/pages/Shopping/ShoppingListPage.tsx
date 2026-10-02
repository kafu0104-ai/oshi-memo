import { Link, useSearchParams } from 'react-router';
import { loadEvents } from '../../services/storage';
import { listShoppingMemos } from '../../services/shoppingMemos';
export default function ShoppingListPage(){
 const [params]=useSearchParams();const eventId=params.get('event');const events=loadEvents();
 let result;try{result=listShoppingMemos(events);}catch{return <main><h1>買い物メモ</h1><p role="alert">一覧を読み込めませんでした。保存設定を確認してください。</p></main>;}
 const items=result.items.filter(m=>!eventId||m.eventId===eventId);const event=events.find(e=>e.id===eventId);
 return <main><header className="page-header"><h1>買い物メモ</h1>{event&&<p>{event.title}</p>}</header>
 <div className="shopping-list-actions"><Link className="primary-link-button" to={`/shopping/new${event?'?event='+encodeURIComponent(event.id):''}`}>＋ 買い物メモを作成</Link><Link className="task-navigation-button" to="/shared">共有している買い物メモ</Link>{eventId&&<Link className="task-navigation-button" to="/shopping">すべての買い物メモ</Link>}</div>
 {result.errors.length>0&&<p role="alert">一部のメモを読み込めませんでした。保存データは変更していません。</p>}
 <div className="management-links">{items.map(m=><Link className="management-card shopping-memo-list-card" key={m.id} to={`/shopping/${m.id}`}><div><strong>{m.title}</strong>{m.eventTitle&&m.eventTitle!==m.title&&<small className="shopping-related-event">{m.eventTitle}</small>}</div><span aria-hidden="true">›</span></Link>)}</div>
 {!items.length&&<p>買い物メモはまだありません。イベントを登録せずに作成できます。</p>}
 </main>;
}
