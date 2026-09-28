// Thumbnail cache is separate from localStorage so large catalogs do not exhaust memo storage.
const database = 'oshi-product-thumbnails-v1';
async function cache(source: string, value?: string): Promise<string | undefined> {
  try {
    return await new Promise((resolve, reject) => {
      const open = indexedDB.open(database, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('images');
      open.onerror = () => reject(open.error);
      open.onblocked = () => resolve(undefined);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('images', value ? 'readwrite' : 'readonly');
        const request = value ? tx.objectStore('images').put(value, source) : tx.objectStore('images').get(source);
        tx.oncomplete = () => { db.close(); resolve(value ?? request.result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  } catch { return undefined; }
}
export async function compressProductImage(source: string): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('画像を読み込めませんでした。')), 15000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('画像を読み込めませんでした。')); };
    image.src = source;
  });
  const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を作成できませんでした。');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL('image/jpeg', 0.8);
  canvas.width = canvas.height = 1;
  return result;
}
const pending = new Map<string, Promise<string>>();
export async function productThumbnail(source: string): Promise<string> {
  const running = pending.get(source); if (running) return running;
  const task = (async () => {
    const saved = await cache(source); if (saved) return saved;
    let data = source;
    if (source.startsWith('https://')) {
      const response = await fetch('/api/goods-image', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:source}),signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error('画像を取得できませんでした。');
      data = (await response.json()).html;
    }
    const result = await compressProductImage(data);
    await cache(source, result);
    return result;
  })();
  pending.set(source, task);
  try { return await task; } finally { pending.delete(source); }
}
