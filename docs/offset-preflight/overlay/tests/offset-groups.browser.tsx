import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '../src/index.css';
import SettlementTaskForm from '../src/pages/Home/SettlementTaskForm';
import {GroupDetails} from '../src/pages/Home/OffsetGroupPage';
import {CompletedTasksPage} from '../src/pages/Home/TicketTaskPage';
import TicketTodos from '../src/pages/Home/TicketTodos';
import {loadTicketTasks} from '../src/services/ticketTasks';
import {loadTickets,loadEvents} from '../src/services/storage';
import {offsetGroups} from '../src/services/offsetGroups';
import {captureSnapshot,restoreSnapshot} from '../src/services/personalSnapshot';
// Dedicated in-memory Storage. Only this harness's sessionStorage key persists
// test records across reload; the app's real localStorage is never read or written.
const key='oshi-offset-acceptance-fixture-v1';
const records=new Map<string,string>(JSON.parse(sessionStorage.getItem(key)??'[]'));
const persist=()=>sessionStorage.setItem(key,JSON.stringify([...records]));
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>{records.set(k,v);persist();},removeItem:(k:string)=>{records.delete(k);persist();},get length(){return records.size},key:(i:number)=>[...records.keys()][i]??null}});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const root=createRoot(document.querySelector('#fixture')!);const output=document.querySelector('#results')!;
const assertion=(value:unknown,text:string)=>{if(!value)throw new Error(text)};
const mount=async(node:React.ReactNode)=>{await act(async()=>root.render(<MemoryRouter><React.Fragment key={crypto.randomUUID()}>{node}</React.Fragment></MemoryRouter>));};
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('#fixture button')].find(b=>b.textContent===text)!;
const click=async(element:HTMLElement)=>{assertion(element,'操作対象がありません');await act(async()=>element.click());};
const input=async(el:HTMLInputElement,value:string)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});};
function fixture(){
 records.clear();persist();
 localStorage.setItem('oshi-memo-events',JSON.stringify([{id:'mappa',title:'MAPPA EXPO'},{id:'bungo',title:'文スト'}]));
 localStorage.setItem('oshi-memo-companions',JSON.stringify([{id:'toko',name:'とこ'}]));
 localStorage.setItem('oshi-memo-tickets',JSON.stringify([2275,4045].map((amount,i)=>({id:`t${i}`,eventId:i?'bungo':'mappa',receptions:[{id:`r${i}`,name:'入場券',seatTypes:[{id:'seat',name:'一般',price:amount}],fees:[],applications:[{id:`a${i}`,seatTypeId:'seat',quantity:2,companionIds:['toko'],status:'won',fulfillment:{payment:{payerId:i?'toko':'self',isPaid:true,deadlineDate:'2026-10-18',settlements:[{id:`s${i}`,companionId:'toko',direction:i?'pay':'receive',amount,amountMode:'manual',isSettled:false}]},issuance:{isIssued:false},distributions:[],seatAssignments:[]}}]}]}))));
}
async function until(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});}throw new Error('保存完了待ちがタイムアウトしました');}
async function setupOffset(){
 const before=JSON.stringify(loadTickets());
 await mount(<SettlementTaskForm task={loadTicketTasks().find(t=>t.settlementId==='s0')!} initialMode="offset" onSaved={()=>{}}/>);
 assertion(document.querySelector('#fixture')!.textContent!.includes('文スト'),'相手イベントが表示されない');
 await click(document.querySelector<HTMLInputElement>('#fixture .settlement-event input[type=checkbox]')!);
 assertion(document.querySelector('#fixture')!.textContent!.includes('相殺予定'),'予定タグ');
 await input(document.querySelector<HTMLInputElement>('#fixture input[type=date]')!,'2026-10-08');
 await click(button('内容を確認する'));assertion(JSON.stringify(loadTickets())===before,'確認前に保存');
 await click(button('この内容で確定'));await until(()=>offsetGroups(loadTickets(),loadEvents()).some(g=>!g.cancelled&&g.remaining===1770));
}
async function run(){
 const lines:string[]=[];output.textContent='検証中';
 try{
 fixture();await setupOffset();lines.push('PASS 候補選択・確認・1770円支払の相殺保存');
 await mount(<TicketTodos all/>);assertion(document.querySelector('#fixture')!.textContent!.includes('未完了 1件'),'ホーム集約');lines.push('PASS ホームは相殺中タスク1件');
 let group=offsetGroups(loadTickets(),loadEvents())[0];await mount(<GroupDetails id={group.id}/>);
 await click(button('相殺を取り消す'));await click(button('この内容で確定'));await until(()=>offsetGroups(loadTickets(),loadEvents()).every(g=>g.cancelled));assertion(loadTickets().every(t=>!t.receptions[0].applications[0].fulfillment!.payment.settlements[0].isSettled),'取消残高');lines.push('PASS 確認つき取消・元の未精算復元');
 await setupOffset();group=offsetGroups(loadTickets(),loadEvents()).find(g=>!g.cancelled)!;await mount(<GroupDetails id={group.id}/>);
 await input(document.querySelector<HTMLInputElement>('#fixture input[type=date]')!,'2026-10-09');await click(button('支払いを記録'));await click(button('この内容で確定'));await until(()=>!!offsetGroups(loadTickets(),loadEvents()).find(g=>g.id===group.id)?.completed);
 assertion(offsetGroups(loadTickets(),loadEvents()).find(g=>g.id===group.id)!.completed,'完了しない');lines.push('PASS 差額支払い・関連精算の一括完了');
 const snapshot=JSON.parse(JSON.stringify(captureSnapshot()));records.clear();restoreSnapshot(snapshot);await mount(<CompletedTasksPage/>);
 assertion(document.querySelector('#fixture')!.textContent!.includes('1,770円支払済み'),'アーカイブ');lines.push('PASS 同期形式の往復後も履歴とアーカイブ保持');
 await mount(<TicketTodos all/>);assertion(document.querySelector('#fixture')!.textContent!.includes('未完了 0件'),'未完了残存');lines.push('PASS ホームの未完了から消える');
 await mount(<GroupDetails id={group.id}/>);assertion(!button('相殺を取り消す'),'完了後の取消禁止');lines.push('PASS 完了後は取消不可');
 output.textContent=lines.join('\n')+'\n完了：7/7成功';
 }catch(e){output.textContent=lines.join('\n')+`\nFAIL ${e}`;}
}
document.querySelector('#run')!.addEventListener('click',()=>void run());
document.querySelector('#pending')!.addEventListener('click',()=>void(async()=>{fixture();await setupOffset();await mount(<GroupDetails id={offsetGroups(loadTickets(),loadEvents())[0].id}/>);output.textContent='検証用：相殺中・1770円支払';})());
document.querySelector('#reload')!.addEventListener('click',()=>void(async()=>{const group=offsetGroups(loadTickets(),loadEvents()).find(g=>!g.cancelled);if(group){await mount(<GroupDetails id={group.id}/>);output.textContent=`再表示：${group.id} ／ ${group.completed?'相殺済み':'相殺中'} ／ 残額${group.remaining}円`;}else output.textContent='検証データなし';})());
