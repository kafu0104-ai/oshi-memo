// Only personal app records are transferable. Authentication tokens and sync metadata
// must never be included, even when new browser storage keys are introduced.
const fixedKeys=['oshi-memo-events','oshi-memo-tickets','oshi-memo-companions','oshi-memo-task-tags','oshi-memo-theme','oshi-memo-exchanges','oshi-memo-calendar','oshi-memo-exchange-history'];
export const personalKey=(key:string)=>fixedKeys.includes(key)||/^oshi-memo-shopping-[a-zA-Z0-9_-]+$/.test(key);
export interface PersonalSnapshot {version:1; records:Record<string,string>}
export function validateSnapshot(value:unknown):PersonalSnapshot {
 if(!value||typeof value!=='object'||!('version' in value)||value.version!==1||!('records' in value)||!value.records||typeof value.records!=='object'||Array.isArray(value.records))throw new Error('INVALID_SNAPSHOT');
 for(const [key,raw] of Object.entries(value.records)){
  if(!personalKey(key)||typeof raw!=='string')throw new Error('INVALID_SNAPSHOT');
  if(key==='oshi-memo-theme')continue;
  const parsed=JSON.parse(raw);
  if(key.startsWith('oshi-memo-shopping-')){
   if(!parsed||!Array.isArray(parsed.products)||!Array.isArray(parsed.buyers)||!Array.isArray(parsed.soldOut)||!Array.isArray(parsed.bonusLabels)||!parsed.orders||!parsed.bonuses)throw new Error('INVALID_SNAPSHOT');
  }else if(!Array.isArray(parsed))throw new Error('INVALID_SNAPSHOT');
 }
 return value as PersonalSnapshot;
}
export function captureSnapshot(storage:Storage=localStorage):PersonalSnapshot {
 const records:Record<string,string>={};
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&personalKey(key))records[key]=storage.getItem(key)!;}
 return validateSnapshot({version:1,records});
}
export function sameSnapshot(a:PersonalSnapshot,b:PersonalSnapshot){
 const keys=Object.keys(a.records);
 return keys.length===Object.keys(b.records).length&&keys.every(key=>a.records[key]===b.records[key]);
}
export function restoreSnapshot(value:unknown,storage:Storage=localStorage){
 const next=validateSnapshot(value),previous=captureSnapshot(storage);
 // A backup must succeed before changing any personal records.
 const backupKey=`oshi-memo-backup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 storage.setItem(backupKey,JSON.stringify(previous));
 const write=(snapshot:PersonalSnapshot)=>{
  const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((key):key is string=>key!==null&&personalKey(key));
  keys.forEach(key=>storage.removeItem(key));
  Object.entries(snapshot.records).forEach(([key,raw])=>storage.setItem(key,raw));
 };
 try{write(next);}catch(error){write(previous);throw error;}
}
export function snapshotSummary(snapshot:PersonalSnapshot){
 const count=(key:string)=>JSON.parse(snapshot.records[key]||'[]').length as number;
 return `イベント ${count('oshi-memo-events')}件・チケット ${count('oshi-memo-tickets')}件・買い物メモ ${Object.keys(snapshot.records).filter(k=>k.startsWith('oshi-memo-shopping-')).length}件・交換／譲渡 ${count('oshi-memo-exchanges')}件`;
}
export function exportSnapshot(snapshot:PersonalSnapshot){
 const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`oshi-memo-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
