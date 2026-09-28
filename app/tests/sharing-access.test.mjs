// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
test('sharing permissions, invitations, revision conflicts, and revocation',async()=>{
 const db=new PGlite();
 const A='00000000-0000-4000-8000-000000000001';
 const B='00000000-0000-4000-8000-000000000002';
 const C='00000000-0000-4000-8000-000000000003';
 const D='00000000-0000-4000-8000-000000000004';
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;
 insert into auth.users values ('${A}','a@example.com',now()),('${B}','b@example.com',now()),('${C}','c@example.com',now()),('${D}','d@example.com',now());`);
 await db.exec(await readFile('../supabase/migrations/202609250001_shared_shopping.sql','utf8'));
 async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 async function rpc(name,params){const {rows}=await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as result`,params);return rows[0].result;}
 try{
  await user(A);const room=await rpc('create_shopping_room',['test','{}','A']);
  const editor=await rpc('invite_shopping_member',[room,'b@example.com','editor']);
  const viewer=await rpc('invite_shopping_member',[room,'c@example.com','viewer']);
  await user(D);assert.equal((await db.query('select * from shopping_rooms')).rows.length,0);
  await assert.rejects(rpc('accept_shopping_invite',[editor,'D']),/INVALID_INVITE/);
  await assert.rejects(rpc('invite_shopping_member',[room,'d@example.com','editor']),/NO_ACCESS/);
  await assert.rejects(db.query("insert into shopping_members values($1,$2,'owner','D')",[room,D]),/permission denied/);
  await user(B);assert.equal(await rpc('accept_shopping_invite',[editor,'B']),room);
  await assert.rejects(rpc('accept_shopping_invite',[editor,'B']),/INVALID_INVITE/);
  assert.equal((await db.query('select * from shopping_rooms')).rows.length,1);
  assert.equal((await db.query('select * from shopping_invites')).rows.length,0);
  assert.equal(await rpc('save_shopping_room',[room,1,'{"saved":true}']),2);
  await user(A);await assert.rejects(rpc('save_shopping_room',[room,1,'{}']),/CONFLICT/);
  await assert.rejects(rpc('save_shopping_room',[room,null,'{}']),/CONFLICT/);
  await user(C);await rpc('accept_shopping_invite',[viewer,'C']);
  await assert.rejects(rpc('save_shopping_room',[room,2,'{}']),/NO_ACCESS/);
  await assert.rejects(db.query('update shopping_rooms set memo=$1 where id=$2',['{}',room]),/permission denied/);
  await user(A);const revoked=await rpc('invite_shopping_member',[room,'d@example.com','editor']);
  const inv=(await db.query("select id from shopping_invites where email='d@example.com'")).rows[0].id;
  await rpc('revoke_shopping_invite',[room,inv]);await user(D);await assert.rejects(rpc('accept_shopping_invite',[revoked,'D']),/INVALID_INVITE/);
  await user(A);const expired=await rpc('invite_shopping_member',[room,'d@example.com','viewer']);
  await db.exec('reset role');await db.query("update shopping_invites set expires_at=now()-interval '1 day' where room_id=$1 and email='d@example.com'",[room]);
  await user(D);await assert.rejects(rpc('accept_shopping_invite',[expired,'D']),/INVALID_INVITE/);
  await user(A);await rpc('remove_shopping_member',[room,B]);await user(B);
  assert.equal((await db.query('select * from shopping_rooms')).rows.length,0);
  await assert.rejects(rpc('save_shopping_room',[room,2,'{}']),/NO_ACCESS/);
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select * from shopping_rooms'),/permission denied/);
  await assert.rejects(rpc('create_shopping_room',['test','{}','anon']),/permission denied/);
 }finally{await db.close();}
});
