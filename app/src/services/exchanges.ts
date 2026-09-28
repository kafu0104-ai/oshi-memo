export const EXCHANGE_KEY = 'oshi-memo-exchanges';
export type ExchangeKind = 'exchange' | 'give' | 'receive';
export type ExchangeStage = 'recruiting' | 'negotiating' | 'active' | 'completed' | 'cancelled';
export interface ExchangeItem { name:string; quantity:number }
export interface ExchangeRecord {
  id:string; kind:ExchangeKind; stage:ExchangeStage; partner:string; contact:string; eventId:string;
  outgoing:ExchangeItem[]; incoming:ExchangeItem[]; method:'mail'|'hand';
  money:'none'|'pay'|'receive'; amount:string; deadline:string; time:string; place:string;
  tracking:string; memo:string; done:Record<string,boolean>; createdAt:string; updatedAt:string;
}
export const exchangeKinds = {exchange:'交換',give:'譲る',receive:'譲ってもらう'};
export const exchangeStages = {recruiting:'募集中',negotiating:'声かけ中',active:'やり取り中',completed:'取引完了',cancelled:'見送り・中止'};
export function exchangeSteps(record:ExchangeRecord) {
  const steps:{id:string;label:string;tag:string}[]=[];
  if(record.money!=='none') steps.push({id:'money',label:record.money==='pay'?'代金を支払う':'入金を確認する',tag:record.money==='pay'?'payment':'income'});
  if(record.kind!=='receive') steps.push({id:'send',label:record.method==='mail'?'商品を発送する':'商品を手渡す',tag:record.method==='mail'?'shipping':'handover'});
  if(record.kind!=='give') steps.push({id:'receive',label:'商品を受け取る',tag:'receipt'});
  if(record.kind!=='give') steps.push({id:'notified',label:'相手へ受け取りを連絡する',tag:'contact'});
  if(record.kind!=='receive') steps.push({id:'delivered',label:'相手からの受取連絡を確認する',tag:'receipt'});
  return steps;
}
export function exchangeError(record:ExchangeRecord):string {
  if(!record.partner.trim()) return '相手の名前・ニックネームを入力してください。';
  const groups=[...(record.kind!=='receive'?[record.outgoing]:[]),...(record.kind!=='give'?[record.incoming]:[])];
  if(groups.some(items=>!items.length||items.some(item=>!item.name.trim()||!Number.isSafeInteger(item.quantity)||item.quantity<1))) return '商品名と1以上の個数を入力してください。';
  if(record.money!=='none'&&record.amount!==''&&(!/^\d+$/.test(record.amount)||!Number.isSafeInteger(Number(record.amount)))) return '金額は0円以上の整数で入力してください。';
  if(record.time&&!record.deadline) return '待ち合わせ時刻を指定する場合は日付も入力してください。';
  if(record.stage==='completed'&&exchangeSteps(record).some(step=>!record.done[step.id])) return '確認項目をすべてチェックしてから完了にしてください。';
  return '';
}
export function loadExchanges():ExchangeRecord[] {
  const raw=localStorage.getItem(EXCHANGE_KEY); if(!raw)return [];
  const records=JSON.parse(raw);
  if(!Array.isArray(records)||records.some(r=>!r||typeof r.id!=='string'||!Array.isArray(r.outgoing)||!Array.isArray(r.incoming)||!r.done||!(r.kind in exchangeKinds)||!(r.stage in exchangeStages))) throw new Error('交換・譲渡データを読み込めませんでした。');
  return records;
}
export function saveExchanges(records:ExchangeRecord[]) {localStorage.setItem(EXCHANGE_KEY,JSON.stringify(records));}
