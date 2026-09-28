import { useRef, useState } from 'react';

// Store a small thumbnail rather than the original phone photo in local storage.
async function thumbnail(file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error('25MB以下の画像を選んでください。');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}

export default function ProductThumbnail({ image, name, onSave }: { image?: string; name: string; onSave: (image: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const save = useRef(onSave);
  save.current = onSave;
  const [failed, setFailed] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = image && failed !== image;
  return <div className="product-thumbnail">
    <button type="button" className="product-thumbnail-button" disabled={busy} aria-label={`${name}の画像を${visible ? '変更' : '追加'}`} onClick={() => input.current?.click()}>
      {visible ? <img src={image} alt={name} loading="lazy" onError={() => setFailed(image)} /> : <span aria-hidden="true">{busy ? '…' : '＋'}</span>}
    </button>
    <input ref={input} type="file" accept="image/*" hidden onChange={async e => {
      const file = e.currentTarget.files?.[0];
      e.currentTarget.value = '';
      if (!file) return;
      setBusy(true); setError('');
      try { const result = await thumbnail(file); save.current(result); setFailed(undefined); }
      catch (cause) { setError(cause instanceof Error && cause.message.includes('25MB') ? cause.message : '画像を読み込めませんでした。JPEGやPNGの画像でお試しください。'); }
      finally { setBusy(false); }
    }} />
    {error && <p role="alert">{error}</p>}
  </div>;
}
