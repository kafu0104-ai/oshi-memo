import { listShoppingMemos } from "../../services/shoppingMemos";
import { useState } from 'react';
import { loadEvents } from '../../services/storage';
import { loadShopping, type ShoppingProduct } from '../../services/shopping';

export default function ShoppingProductPicker({ onSelect }: { onSelect: (shop: string, product: string) => void }) {
  const [source] = useState(() => {
    const items: { id: string; title: string; products: ShoppingProduct[] }[] = [];
    let failed = false;
    try {
      const catalog=listShoppingMemos(loadEvents());
      failed=catalog.errors.length>0;
      for (const event of catalog.items) {
        try {
          const products = loadShopping(event.id).products;
          if (products.length) items.push({ id: event.id, title: event.title, products });
        } catch { failed = true; }
      }
    } catch { failed = true; }
    return { items, failed };
  });
  const [eventId, setEventId] = useState('');
  const [productId, setProductId] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const event = source.items.find(item => item.id === eventId);
  const product = event?.products.find(item => item.id === productId);
  const products = event?.products.filter(item => `${item.name} ${item.variant} ${item.character ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  return <details className="exchange-section">
    <summary>買い物メモから選ぶ</summary>
    {source.failed && <p role="alert">一部の買い物メモを読み込めませんでした。手入力もできます。</p>}
    {!source.items.length ? <p>商品を登録した買い物メモがありません。下の欄に直接入力できます。</p> : <>
      <label className="form-field">買い物メモを選択<select value={eventId} onChange={e => { setEventId(e.target.value); setProductId(''); setQuery(''); setMessage(''); }}>
        <option value="">選んでください</option>
        {source.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {event && <>
        <label className="form-field">商品を検索<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="商品名・キャラクター名" /></label>
        <label className="form-field">商品を選択<select value={productId} onChange={e => { setProductId(e.target.value); setMessage(''); }}>
          <option value="">選んでください</option>
          {product && !products.some(item => item.id === product.id) && <option value={product.id}>{product.name} {product.variant}</option>}
          {products.map(item => <option key={item.id} value={item.id}>{item.name} {item.variant}</option>)}
        </select></label>
        {!products.length && <p>検索に一致する商品がありません。</p>}
        <p className="shopping-note">メモ名と商品名を入力します。入力後も自由に編集できます。</p>
        <button type="button" disabled={!product} onClick={() => { if (product) { onSelect(event.title, product.name); setMessage('購入場所・イベントと商品名を入力しました。'); } }}>選択内容を入力</button>
      </>}
    </>}
    {message && <p role="status">{message}</p>}
  </details>;
}
