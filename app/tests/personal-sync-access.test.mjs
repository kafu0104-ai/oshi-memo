import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('personal snapshots isolate accounts and reject stale revisions and direct writes',async()=>{
 const db=new PGlite();
 const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;insert into auth.users(id) values('${A}'),('${B}');`);
 await db.exec(await readFile('../supabase/migrations/202609250003_personal_sync.sql','utf8'));
 async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 const save=async(revision,payload={version:1,records:{}})=>(await db.query('select save_personal_snapshot($1::jsonb,$2) as revision',[JSON.stringify(payload),revision])).rows[0].revision;
 await user(A);assert.equal(await save(0),1);await assert.rejects(save(0),/SYNC_CONFLICT/);assert.equal(await save(1),2);await assert.rejects(save(1),/SYNC_CONFLICT/);
 await user(B);assert.equal((await db.query('select * from personal_snapshots')).rows.length,0);await assert.rejects(save(2),/SYNC_CONFLICT/);assert.equal(await save(0),1);
 await assert.rejects(db.query('update personal_snapshots set revision=100'),/permission denied/);
 await assert.rejects(db.query('delete from personal_snapshots'),/permission denied/);
 await assert.rejects(db.query('insert into personal_snapshots(user_id,payload) values($1,$2)',[A,'{}']),/permission denied/);
 await user(A);assert.equal((await db.query('select revision from personal_snapshots')).rows[0].revision,2);
 await assert.rejects(save(2,[]),/INVALID_SNAPSHOT/);
 await db.exec(`reset role;update auth.users set is_anonymous=true where id='${B}'`);await user(B);await assert.rejects(save(1),/LOGIN_REQUIRED/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from personal_snapshots'),/permission denied/);await assert.rejects(save(0),/permission denied/);
 }finally{await db.close();}
});

test('official candidates and applied sources round-trip through the existing cloud RPC and local restore',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
 const fs=require('node:fs'),ts=require('typescript');
 require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const {structuredCandidates,fieldStates}=require('../src/services/officialCandidates.ts');
 const {applySelection}=require('../src/services/officialSelection.ts');
 const {captureSnapshot,restoreSnapshot}=require('../src/services/personalSnapshot.ts');
 const candidates=structuredCandidates([{'@type':'MusicEvent',name:'東京公演',startDate:'2026-10-17T18:00:00+09:00',location:{name:'東京ホール'}},{'@type':'MusicEvent',name:'大阪公演',startDate:'2026-10-24T17:00:00+09:00',location:{name:'大阪ホール'}}],'https://example.com/','2026-10-08T00:00:00Z');
 const report={version:1,requestedUrl:'https://example.com/',fetchedAt:'2026-10-08T00:00:00Z',candidates,issues:[],visited:['https://example.com/'],fields:fieldStates(candidates)};
 const applied=applySelection(report,{fields:{},shows:candidates.map(c=>c.id),rounds:[]});
 const legacy={id:'legacy',title:'旧イベント',startDate:'2026-10-01',endDate:'2026-10-01',venue:'旧会場',schedule:[]};
 const events=[legacy,{...legacy,id:'new',title:'手入力名を保持',officialImport:applied.report,performances:applied.shows}];
 const map=new Map([['oshi-memo-events',JSON.stringify(events)]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),get length(){return map.size},key:i=>[...map.keys()][i]??null};
 const snapshot=captureSnapshot(storage),db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select '00000000-0000-4000-8000-000000000001'::uuid$$;insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');`);
 await db.exec(await readFile('../supabase/migrations/202609250003_personal_sync.sql','utf8'));
 await db.exec('set role authenticated');
 const save=async(payload,revision)=>db.query('select save_personal_snapshot($1::jsonb,$2)',[JSON.stringify(payload),revision]);
 await save(snapshot,0);
 const remote=(await db.query('select payload,revision from personal_snapshots')).rows[0];
 assert.deepEqual(remote.payload,snapshot);assert.equal(remote.revision,1);
 map.clear();restoreSnapshot(remote.payload,storage);assert.deepEqual(JSON.parse(storage.getItem('oshi-memo-events')),JSON.parse(JSON.stringify(events)));
 const edited=JSON.parse(storage.getItem('oshi-memo-events'));edited[1].title='同期後の再編集';storage.setItem('oshi-memo-events',JSON.stringify(edited));await save(captureSnapshot(storage),1);
 const next=(await db.query('select payload,revision from personal_snapshots')).rows[0];assert.equal(next.revision,2);
 assert.deepEqual(JSON.parse(next.payload.records['oshi-memo-events'])[1].officialImport,JSON.parse(JSON.stringify(applied.report)));
 await assert.rejects(save(snapshot,1),/SYNC_CONFLICT/);
 await assert.rejects(save({version:1,records:{'oshi-memo-events':'x'.repeat(10000001)}},2),/INVALID_SNAPSHOT/);
 assert.deepEqual((await db.query('select payload,revision from personal_snapshots')).rows[0],next);
 }finally{await db.close();}
});
