import { useState } from "react";
import { loadTicketByEventId, saveTicket } from "../../services/storage";

export default function DeleteReception({ eventId, receptionId, name, onDeleted }: {
  eventId: string; receptionId: string; name: string; onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  function remove() {
    try {
      const ticket = loadTicketByEventId(eventId);
      if (!ticket || !ticket.receptions.some(item => item.id === receptionId)) {
        setError("チケット情報が見つかりません。ページを再読み込みしてください。"); return;
      }
      saveTicket({ ...ticket, receptions: ticket.receptions.filter(item => item.id !== receptionId) });
      onDeleted();
    } catch {
      setError("削除できませんでした。ブラウザの保存設定を確認して、もう一度お試しください。");
    }
  }
  return <section className="ticket-delete-section">
    {!confirming ? <button type="button" className="secondary-button" onClick={() => setConfirming(true)}>このチケット情報を削除</button> : <>
      <p><strong>「{name}」を削除しますか？</strong></p>
      <p>このチケット情報の券種・当落・支払い・精算の記録も削除されます。イベント本体、ほかのチケット情報、登録済みの同行者は残ります。この操作は取り消せません。</p>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setConfirming(false); setError(""); }}>キャンセル</button><button type="button" onClick={remove}>削除する</button></div>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
