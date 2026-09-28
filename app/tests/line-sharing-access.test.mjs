import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('LINE users without email need owner approval; links are single-use and revocable',async()=>{
 const db=new PGlite();const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000003',D='00000000-0000-4000-8000-000000000004';
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;
 insert into auth.users(id) values('${A}'),('${B}'),('${C}'),('${D}');`);
 for(const name of ['202609250001_shared_shopping.sql','202609250002_line_join_requests.sql'])await db.exec(await readFile('../supabase/migrations/'+name,'utf8'));
 async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 async function rpc(name,params){const {rows}=await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as result`,params);return rows[0].result;}
 try{
  await user(A);const room=await rpc('create_shopping_room',['LINE test','{}','A']);const token=await rpc('create_shopping_join_link',[room,'B向け','editor']);
  await user(B);const request=await rpc('request_shopping_join',[token,'B']);assert.equal(await rpc('request_shopping_join',[token,'B']),request);
  assert.equal((await db.query('select * from shopping_rooms')).rows.length,0);
  await assert.rejects(rpc('save_shopping_room',[room,1,'{}']),/NO_ACCESS/);
  await assert.rejects(rpc('decide_shopping_join',[request,true]),/NO_ACCESS/);
  await user(C);const other=await rpc('request_shopping_join',[token,'C']);assert.equal((await db.query('select * from shopping_join_requests')).rows.length,1);
  await assert.rejects(db.query("update shopping_join_requests set status='approved' where id=$1",[other]),/permission denied/);
  await user(A);await rpc('decide_shopping_join',[request,true]);
  await assert.rejects(rpc('decide_shopping_join',[other,true]),/REQUEST_CLOSED/);
  await user(B);assert.equal((await db.query('select * from shopping_rooms')).rows.length,1);assert.equal(await rpc('save_shopping_room',[room,1,'{}']),2);
  await user(C);assert.equal((await db.query('select * from shopping_rooms')).rows.length,0);await assert.rejects(rpc('request_shopping_join',[token,'C']),/INVALID_INVITE/);
  await user(A);const viewToken=await rpc('create_shopping_join_link',[room,'C向け','viewer']);
  await user(C);const viewRequest=await rpc('request_shopping_join',[viewToken,'C']);await user(A);await rpc('decide_shopping_join',[viewRequest,true]);
  await user(C);assert.equal((await db.query('select * from shopping_rooms')).rows.length,1);await assert.rejects(rpc('save_shopping_room',[room,2,'{}']),/NO_ACCESS/);
  await user(A);const canceled=await rpc('create_shopping_join_link',[room,'D向け','editor']);await user(D);const pending=await rpc('request_shopping_join',[canceled,'D']);await user(A);
  const link=(await db.query("select id from shopping_join_links where label='D向け'")).rows[0].id;
  await rpc('revoke_shopping_join_link',[room,link]);await assert.rejects(rpc('decide_shopping_join',[pending,true]),/REQUEST_CLOSED/);
  await user(D);await assert.rejects(rpc('request_shopping_join',[canceled,'D']),/INVALID_INVITE/);
  await user(A);const expiry=await rpc('create_shopping_join_link',[room,'期限切れ','editor']);
  await db.exec("reset role;update shopping_join_links set expires_at=now()-interval '1 day' where label='期限切れ'");await user(D);await assert.rejects(rpc('request_shopping_join',[expiry,'D']),/INVALID_INVITE/);
  await user(A);await rpc('remove_shopping_member',[room,B]);await user(B);assert.equal((await db.query('select * from shopping_rooms')).rows.length,0);await assert.rejects(rpc('request_shopping_join',[token,'B']),/INVALID_INVITE/);
  await db.exec(`reset role;update auth.users set is_anonymous=true where id='${D}'`);await user(D);await assert.rejects(rpc('create_shopping_room',['anonymous','{}','D']),/LOGIN_REQUIRED/);
  await db.exec('reset role;set role anon');await assert.rejects(rpc('request_shopping_join',[token,'anon']),/permission denied/);
 }finally{await db.close();}
});
