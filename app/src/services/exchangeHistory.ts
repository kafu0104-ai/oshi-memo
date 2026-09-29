import type { ExchangeTemplateFields,ExchangeTemplateKind } from './exchangeTemplates';
export const EXCHANGE_HISTORY_KEY='oshi-memo-exchange-history';
export interface ExchangeHistoryItem {id:string;name:string;createdAt:string;kind:ExchangeTemplateKind;fields:ExchangeTemplateFields;text:string}
export function loadExchangeHistory():ExchangeHistoryItem[]{
 const raw=localStorage.getItem(EXCHANGE_HISTORY_KEY);if(!raw)return [];
 const data=JSON.parse(raw);
 if(!Array.isArray(data)||data.some(v=>!v||typeof v.id!=='string'||typeof v.name!=='string'||typeof v.text!=='string'||typeof v.createdAt!=='string'||!['post','approach','reply','dm'].includes(v.kind)||!v.fields||typeof v.fields!=='object'||['shop','product','offer','seek','delivery','packing','shipping','address','note','partner'].some(k=>typeof v.fields[k]!=='string')))throw new Error('文章履歴を読み込めませんでした。');
 return data;
}
export function saveExchangeHistory(items:ExchangeHistoryItem[]){localStorage.setItem(EXCHANGE_HISTORY_KEY,JSON.stringify(items));}
