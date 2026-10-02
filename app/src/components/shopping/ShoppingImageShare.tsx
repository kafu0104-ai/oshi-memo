import { productThumbnail } from "../../services/productThumbnail";
import { useEffect, useRef, useState } from "react";
import { orderFor, totals, type ShoppingMemo } from "../../services/shopping";

const yen = (value: number) => `${value.toLocaleString("ja-JP")}円`;
async function loadThumbnail(source?: string): Promise<HTMLImageElement | null> {
  if (!source) return null;
  try {
    const url = await productThumbnail(source);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 12000);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(new Error("image")); };
      img.src = url;
    });
    return img;
  } catch { return null; }
}
async function thumbnail(source?: string): Promise<HTMLImageElement | null> {
  if (!source) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const image = await loadThumbnail(source);
    if (image) return image;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return null;
}
function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, max: number, height = 30) {
  let line = "", row = 0;
  const chars = Array.from(text.replace(/\s+/g, " "));
  for (let i = 0; i < chars.length; i++) {
    if (ctx.measureText(line + chars[i]).width > width) {
      if (row === max - 1) { ctx.fillText(line.slice(0, -1) + "…", x, y + row * height); return; }
      ctx.fillText(line, x, y + row * height); row++; line = "";
    }
    line += chars[i];
  }
  ctx.fillText(line, x, y + row * height);
}
export default function ShoppingImageShare({ title, memo, buyerIds }: { title: string; memo: ShoppingMemo; buyerIds: string[] }) {
  const [pages, setPages] = useState<{ url: string; file: File }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const urls = useRef<string[]>([]);
  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); }, []);
  async function generate() {
    setBusy(true); setMessage("");
    const next: typeof pages = [];
    try {
      const buyers = memo.buyers.filter(b => buyerIds.includes(b.id));
      const rows = memo.products.flatMap(product => {
        const members = buyers.flatMap(b => {
          const order = orderFor(memo, b.id, product.id);
          return order.quantity > 0 ? [{ buyer: b.name, order }] : [];
        });
        return members.length ? [{ product, members, quantity: members.reduce((sum, m) => sum + m.order.quantity, 0) }] : [];
      });
      if (!rows.length) { setMessage("数量を入力した商品がありません。"); return; }
      
      let missing = 0;
      {
        const group = rows;
        const rowHeights = group.map(row => Math.max(214, 150 + row.members.reduce((sum, m) => sum + (m.order.memo ? 90 : 36), 0)));
        const height = 240 + rowHeights.reduce((sum, h) => sum + h + 16, 0);
        // Keep a single image within mobile canvas dimension and memory limits.
        const scale = Math.min(1, 16000 / height, Math.sqrt(8_000_000 / (800 * height)));
        const canvas = document.createElement("canvas"); canvas.width = Math.floor(800 * scale); canvas.height = Math.floor(height * scale);
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error();
        ctx.scale(scale, scale);
        ctx.fillStyle = "#faf5f0"; ctx.fillRect(0, 0, 800, height);
        ctx.fillStyle = "#544c40"; ctx.font = "bold 28px sans-serif";
        lines(ctx, title, 30, 45, 740, 2, 34);
        ctx.font = "22px sans-serif";
        ctx.fillText(`買い物メモ　${rows.length}件`, 30, 120);
        let rowY = 150;
        for (let start = 0; start < group.length; start += 2) {
        const batch = group.slice(start, start + 2);
        const images = await Promise.all(batch.map(row => thumbnail(row.product.image)));
        batch.forEach(({ product, members, quantity }, offset) => {
          const index = start + offset;
          const y = rowY;
          rowY += rowHeights[index] + 16;
          ctx.fillStyle = "#ffffff"; ctx.fillRect(24, y, 752, rowHeights[index]);
          ctx.fillStyle = "#eee6df"; ctx.fillRect(38, y + 25, 154, 154);
          const img = images[offset];
          if (img) { const scale = Math.min(154 / img.width, 154 / img.height); const w = img.width * scale, h = img.height * scale; ctx.drawImage(img, 38 + (154 - w) / 2, y + 25 + (154 - h) / 2, w, h); }
          else { missing++; ctx.fillStyle = "#756b60"; ctx.font = "20px sans-serif"; ctx.fillText("画像なし", 75, y + 110); }
          ctx.fillStyle = "#544c40"; ctx.font = "bold 24px sans-serif";
          lines(ctx, `${product.name} ${product.variant}`, 212, y + 34, 540, 2);
          ctx.font = "21px sans-serif";
          ctx.fillText(`単価 ${yen(product.price)} × ${quantity} = ${yen(product.price * quantity)}`, 212, y + 97);
          let memberY = y + 133;
          for (const member of members) {
            lines(ctx, `${member.buyer}：${member.order.quantity}点`, 212, memberY, 540, 1);
            if (member.order.memo) lines(ctx, member.order.memo, 212, memberY + 27, 540, 2, 27);
            memberY += member.order.memo ? 90 : 36;
          }
        });
        }
        ctx.fillStyle = "#544c40"; ctx.font = "20px sans-serif";
        ctx.fillText(`選択中の購入者の合計：${yen(buyers.reduce((sum, b) => sum + totals(memo, b.id).amount, 0))}`, 30, height - 44);
        ctx.font = "16px sans-serif"; ctx.fillText("合計は見送り・売切れの未購入分を除きます", 30, height - 18);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error()), "image/png"));
        const file = new File([blob], "買い物メモ.png", { type: "image/png" });
        next.push({ url: URL.createObjectURL(blob), file });
      }
      urls.current.forEach(URL.revokeObjectURL); urls.current = next.map(p => p.url); setPages(next);
      setMessage(`${next.length}枚の画像を作成しました。${missing ? `${missing}件の画像を取得できませんでした。「最新の内容で画像を作成」で再試行できます。` : ""}`);
    } catch { next.forEach(p => URL.revokeObjectURL(p.url)); setMessage("画像を作成できませんでした。もう一度お試しください。"); }
    finally { setBusy(false); }
  }
  async function share(file: File) {
    try { await navigator.share({ files: [file] }); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("共有できませんでした。「画像を保存」または画像の長押しで保存してください。"); }
  }
  return <section className="shopping-image-share" aria-label="画像で共有">
    <p>選択中の購入者の商品を、サムネ付き画像にまとめます。同じ商品は購入者ごとの数量をまとめ、縦長の1枚にします。</p>
    <button type="button" disabled={busy} onClick={generate}>{busy ? "画像を作成中…" : pages.length ? "最新の内容で画像を作成" : "共有用画像を作成"}</button>
    <p role="status">{message}</p>
    {pages.map(({ url, file }, index) => <div key={url}>
      <img className="shopping-share-preview" src={url} alt={`買い物メモの共有画像 ${index + 1}`} />
      <div className="shopping-actions"><a href={url} download={file.name}>画像を保存{pages.length > 1 ? `（${index + 1}枚目）` : ""}</a>
      {typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }) && <button type="button" onClick={() => share(file)}>画像を共有</button>}</div>
    </div>)}
    {pages.length > 0 && <p>スマホでは画像を長押しして保存することもできます。内容を変更したら画像を作り直してください。</p>}
  </section>;
}
