import { generateId } from './id';
import { loadCompanions, saveCompanions } from './storage';
import { loadShopping, saveShopping, type ShoppingMemo } from './shopping';
import { withPersonalDataLock } from './personalDataLock';

/** A new buyer is also a reusable person. Existing IDs and names are never merged. */
export function addShoppingPerson(memoId:string, expected:ShoppingMemo, name:string):Promise<ShoppingMemo> {
  return withPersonalDataLock(()=>{
    const trimmed=name.trim();
    if(!trimmed)throw new Error('名前を入力してください。');
    const current=loadShopping(memoId);
    if(JSON.stringify(current)!==JSON.stringify(expected))throw new Error('買い物メモが更新されています。再読み込みしてから追加してください。');
    const people=loadCompanions();
    if(people.some(p=>p.name.trim()===trimmed)||current.buyers.some(p=>p.name.trim()===trimmed))throw new Error("同じ名前の人がすでに登録されています。登録済みの人を選んでください。非表示にした人は同行者管理で確認してください。");
    const now=new Date().toISOString();
    const person={id:generateId(),name:trimmed,createdAt:now,updatedAt:now};
    const next={...current,buyers:[...current.buyers,{id:person.id,name:person.name}]};
    const previous=localStorage.getItem('oshi-memo-companions');
    saveCompanions([...people,person]);
    try{saveShopping(memoId,next);}
    catch(error){
      if(previous===null)localStorage.removeItem('oshi-memo-companions');
      else localStorage.setItem('oshi-memo-companions',previous);
      throw error;
    }
    return next;
  });
}
