import { Link } from 'react-router';
import { loadEvents, loadTickets } from '../../services/storage';
import { offsetGroups, offsetGroupUrl } from '../../services/offsetGroups';
import { settlementKey } from '../../services/settlementOffsets';
import type { SettlementRef } from '../../types/SettlementOffset';
export default function OffsetLinks({eventId,settlement}:{eventId?:string;settlement?:SettlementRef}) {
 const groups=offsetGroups(loadTickets(),loadEvents()).filter(g=>settlement?g.histories.some(h=>h.allocations.some(a=>settlementKey(a)===settlementKey(settlement))):g.eventIds.includes(eventId??''));
 if(!groups.length)return null;
 return <section aria-label="関連する相殺"><h3>関連する相殺</h3>{groups.map(g=><p key={g.id}><span className="task-tag">{g.cancelled?'相殺取消':g.completed?'相殺済み':'相殺中'}</span> <Link to={offsetGroupUrl(g.id)}>{g.eventNames.join(' ⇄ ')}</Link>{!g.completed&&!g.cancelled&&` ／ 残額 ${g.remaining.toLocaleString('ja-JP')}円`}</p>)}</section>;
}
