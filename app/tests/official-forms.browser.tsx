// Local-only test page. Uses real forms and fake HTTP responses, no cloud writes.
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import EventForm from '../src/components/event/EventForm';
import QuickEventForm from '../src/components/event/QuickEventForm';
import OfficialSourceSummary from '../src/components/event/OfficialSourceSummary';
import {captureSnapshot,restoreSnapshot} from '../src/services/personalSnapshot';
import type {Event} from '../src/types/Event';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const root=createRoot(document.querySelector('#fixture')!);
const output=document.querySelector('#results')!;const lines:string[]=[];let failed=0,saved:Event|undefined;
const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message)};
const input=(selector:string)=>document.querySelector<HTMLInputElement>(selector)!;
const button=(text:string)=>[...document.querySelectorAll('button')].find(b=>b.textContent===text)!;
const set=async(selector:string,value:string)=>{await act(async()=>{const el=input(selector);assert(el,selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new EventConstructor('input',{bubbles:true}));});};
const EventConstructor=window.Event;
const click=async(el:HTMLElement)=>{assert(el,'操作対象がない');await act(async()=>el.click());};
const submit=async()=>{await act(async()=>document.querySelector('form')!.dispatchEvent(new EventConstructor('submit',{bubbles:true,cancelable:true})));assert(saved,'保存されない');};
const onSave=(event:Event)=>{saved=event;};
async function mount(event?:Event,quick=false){saved=undefined;await act(async()=>root.render(<MemoryRouter><React.Fragment key={crypto.randomUUID()}>{quick?<QuickEventForm onSaveEvent={onSave} onCancel={()=>{}}/>:<EventForm editingEvent={event} onSaveEvent={onSave} onCancel={()=>{}}/>}</React.Fragment></MemoryRouter>));}
async function test(name:string,run:()=>Promise<void>){try{await run();lines.push(`PASS ${name}`);}catch(e){failed++;lines.push(`FAIL ${name}: ${e}`);}output.textContent=lines.join('\n');}
const legacy:Event={id:'old',title:'手入力の既存イベント',mainGenreId:'live',tagIds:['live'],startDate:'2026-10-01',endDate:'2026-10-01',venue:'元の会場',memo:'消してはいけないメモ',officialUrl:'https://example.com/',schedule:[],performances:[{id:'old-show',date:'2026-10-01',name:'既存公演',venue:'元の会場',schedule:[{id:'performance-start',type:'start',label:'開演',time:'19:00'}]},{id:'draft',date:'',name:'後日発表の公演',memo:'このメモも保持',schedule:[]}]};
const html=`<html><head><title>公式公演2026</title><script type="application/ld+json">${JSON.stringify([{'@type':'MusicEvent',name:'東京公演',startDate:'2026-10-17T18:00:00+09:00',endDate:'2026-10-17T20:00:00+09:00',location:{name:'東京ホール'}},{'@type':'MusicEvent',name:'大阪公演',startDate:'2026-10-24T17:00:00+09:00',endDate:'2026-10-24T19:00:00+09:00',location:{name:'大阪ホール'}}])}</script></head><body></body></html>`;
const realFetch=window.fetch;
window.fetch=async()=>new Response(JSON.stringify({html,url:'https://example.com/'}),{status:200,headers:{'Content-Type':'application/json'}});
let withSource:Event;
try{
await test('既存イベントは編集・保存してもID・メモ・公演を保持',async()=>{await mount(legacy);await set('#event-title','手編集済み');await submit();assert(saved!.title==='手編集済み'&&saved!.id==='old','title/id');assert(saved!.memo===legacy.memo,'memo');assert(saved!.performances?.length===2,'公演保持');assert(!saved!.officialImport,'旧データに出典を捏造しない');});
await test('候補読み取りだけでは入力内容を変更しない',async()=>{await mount(legacy);await click(button('読み込む'));assert(input('#event-title').value===legacy.title,'未選択title');assert(button('選択した情報を反映').disabled,'初期は未選択');await submit();assert(saved!.venue===legacy.venue&&saved!.performances?.length===2,'未選択で変更');assert(saved!.officialImport?.candidates.length,'候補保存');});
await test('2公演追加で既存公演・名前だけの公演を保持し、再反映で重複しない',async()=>{await mount(legacy);await click(button('読み込む'));const selectShows=async()=>{const choices=[...document.querySelectorAll('label')].filter(x=>x.textContent?.includes('この公演を追加する'));assert(choices.length===2,'2候補');for(const label of choices)await click(label.querySelector('input')!);await click(button('選択した情報を反映'));};await selectShows();await selectShows();await submit();const shows=saved!.performances!;assert(shows.length===4,`公演数 ${shows.length}`);assert(shows.find(p=>p.id==='draft')?.memo==='このメモも保持','下書き保持');assert(shows.find(p=>p.venue==='東京ホール')?.schedule.some(s=>s.time==='20:00'),'終了時刻');assert(shows.find(p=>p.venue==='大阪ホール')?.date==='2026-10-24','大阪日付');assert(saved!.title===legacy.title,'タイトルを無断変更');withSource=JSON.parse(JSON.stringify(saved));});
await test('出典つきイベントの再編集・保存で出典・取得日時・選択情報を保持',async()=>{await mount(withSource);await set('#event-title','出典つき手編集');await submit();assert(JSON.stringify(saved!.officialImport)===JSON.stringify(withSource.officialImport),'メタデータ変化');assert(saved!.performances?.length===4,'公演喪失');withSource=saved!;});
await test('既存スナップショットで保存・JSON転送・復元後も旧イベントと出典を保持',async()=>{const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k),get length(){return map.size},key:(i:number)=>[...map.keys()][i]??null} as Storage;storage.setItem('oshi-memo-events',JSON.stringify([legacy,withSource]));const snapshot=JSON.parse(JSON.stringify(captureSnapshot(storage)));map.clear();restoreSnapshot(snapshot,storage);const restored=JSON.parse(storage.getItem('oshi-memo-events')!);assert(JSON.stringify(restored)===JSON.stringify([legacy,withSource]),'完全な往復');await act(async()=>root.render(<OfficialSourceSummary report={restored[1].officialImport}/>));assert(document.querySelector('a[href="https://example.com/"]'),'出典リンク');assert(document.body.textContent?.includes('JSON-LD'),'抽出方法');});
await test('簡易登録でも複数公演を追加保存し、手入力名を保持',async()=>{await mount(undefined,true);await set('input[required]', '簡易手入力');await set('#event-official-url','https://example.com/');await click(button('読み込む'));for(const label of [...document.querySelectorAll('label')].filter(x=>x.textContent?.includes('この公演を追加する')))await click(label.querySelector('input')!);await click(button('選択した情報を反映'));await submit();assert(saved!.title==='簡易手入力','title');assert(saved!.performances?.length===2,'公演数');assert(saved!.officialImport?.fields.startDate.applied?.length===2,'2公演の出典');});
}finally{window.fetch=realFetch;}
output.textContent=lines.join('\n')+`\n完了：${lines.length-failed}/${lines.length} 成功`;
