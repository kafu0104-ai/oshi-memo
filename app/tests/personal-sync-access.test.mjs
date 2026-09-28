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
