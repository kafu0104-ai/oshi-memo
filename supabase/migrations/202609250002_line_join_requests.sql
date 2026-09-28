begin;
-- Apply after 202609250001. LINE accounts do not need an email address.
create or replace function public.create_shopping_room(p_title text,p_memo jsonb,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and is_anonymous is not true) then raise exception 'LOGIN_REQUIRED'; end if;
 insert into public.shopping_rooms(owner_id,title,memo,updated_by) values(auth.uid(),trim(p_title),p_memo,trim(p_name)) returning id into r;
 insert into public.shopping_members values(r,auth.uid(),'owner',trim(p_name));
 return r;
end $$;
create table public.shopping_join_links (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.shopping_rooms(id) on delete cascade,
 label text not null check(length(label) between 1 and 80),
 role text not null check(role in ('editor','viewer')), token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days', revoked boolean not null default false, used_at timestamptz
);
create table public.shopping_join_requests (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.shopping_join_links(id) on delete cascade,
 room_id uuid not null references public.shopping_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 80),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), unique(link_id,user_id)
);
alter table public.shopping_join_links enable row level security;
alter table public.shopping_join_requests enable row level security;
revoke all on public.shopping_join_links,public.shopping_join_requests from anon,authenticated;
grant select on public.shopping_join_links,public.shopping_join_requests to authenticated;
create policy join_link_owner on public.shopping_join_links for select to authenticated using(private.shopping_role(room_id)='owner');
create policy join_request_read on public.shopping_join_requests for select to authenticated using(user_id=auth.uid() or private.shopping_role(room_id)='owner');
create function public.create_shopping_join_link(p_id uuid,p_label text,p_role text) returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 perform 1 from public.shopping_rooms where id=p_id for update;
 if private.shopping_role(p_id) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.shopping_join_links(room_id,label,role,token_hash) values(p_id,trim(p_label),p_role,encode(sha256(convert_to(token,'UTF8')),'hex'));
 return token;
end $$;
create function public.request_shopping_join(p_token text,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation public.shopping_join_links; r uuid; request_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and is_anonymous is not true) then raise exception 'LOGIN_REQUIRED'; end if;
 select room_id into r from public.shopping_join_links where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 perform 1 from public.shopping_rooms where id=r for update;
 select * into invitation from public.shopping_join_links where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if invitation.id is null or invitation.revoked or invitation.used_at is not null or invitation.expires_at<now() then raise exception 'INVALID_INVITE'; end if;
 insert into public.shopping_join_requests(link_id,room_id,user_id,display_name) values(invitation.id,r,auth.uid(),trim(p_name)) on conflict(link_id,user_id) do nothing;
 select id into request_id from public.shopping_join_requests where link_id=invitation.id and user_id=auth.uid();
 return request_id;
end $$;
create function public.decide_shopping_join(p_request uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare request public.shopping_join_requests; invitation public.shopping_join_links; r uuid;
begin
 select room_id into r from public.shopping_join_requests where id=p_request;
 perform 1 from public.shopping_rooms where id=r for update;
 if private.shopping_role(r) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 select * into request from public.shopping_join_requests where id=p_request for update;
 if request.status is distinct from 'pending' then raise exception 'REQUEST_CLOSED'; end if;
 select * into invitation from public.shopping_join_links where id=request.link_id for update;
 if p_approve is true then
  if invitation.revoked or invitation.used_at is not null or invitation.expires_at<now() then raise exception 'INVALID_INVITE'; end if;
  insert into public.shopping_members values(r,request.user_id,invitation.role,request.display_name) on conflict(room_id,user_id) do nothing;
  update public.shopping_join_links set used_at=now() where id=invitation.id;
  update public.shopping_join_requests set status='rejected' where link_id=invitation.id and status='pending' and id<>p_request;
  update public.shopping_join_requests set status='approved' where id=p_request;
 else
  update public.shopping_join_requests set status='rejected' where id=p_request;
 end if;
end $$;
create function public.revoke_shopping_join_link(p_id uuid,p_link uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.shopping_rooms where id=p_id for update;
 if private.shopping_role(p_id) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 update public.shopping_join_links set revoked=true where room_id=p_id and id=p_link;
 update public.shopping_join_requests set status='rejected' where room_id=p_id and link_id=p_link and status='pending';
end $$;
revoke all on function public.create_shopping_room(text,jsonb,text),public.create_shopping_join_link(uuid,text,text),public.request_shopping_join(text,text),public.decide_shopping_join(uuid,boolean),public.revoke_shopping_join_link(uuid,uuid) from public,anon;
grant execute on function public.create_shopping_room(text,jsonb,text),public.create_shopping_join_link(uuid,text,text),public.request_shopping_join(text,text),public.decide_shopping_join(uuid,boolean),public.revoke_shopping_join_link(uuid,uuid) to authenticated;
commit;
