begin;
-- Apply once in the Supabase SQL editor. No anonymous access or direct writes.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.shopping_rooms (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 title text not null check (length(title) between 1 and 300),
 memo jsonb not null check (jsonb_typeof(memo) = 'object' and octet_length(memo::text) < 3000000),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 updated_by text not null
);
create table public.shopping_members (
 room_id uuid not null references public.shopping_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','editor','viewer')),
 display_name text not null check (length(display_name) between 1 and 80),
 primary key(room_id,user_id)
);
create table public.shopping_invites (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.shopping_rooms(id) on delete cascade,
 email text not null, role text not null check (role in ('editor','viewer')),
 token_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days',
 used_at timestamptz, revoked boolean not null default false
);
alter table public.shopping_rooms enable row level security;
alter table public.shopping_members enable row level security;
alter table public.shopping_invites enable row level security;
revoke all on public.shopping_rooms, public.shopping_members, public.shopping_invites from anon, authenticated;
grant select on public.shopping_rooms, public.shopping_members, public.shopping_invites to authenticated;
create function private.shopping_role(r uuid) returns text language sql stable security definer set search_path = '' as $$
 select role from public.shopping_members where room_id=r and user_id=(select auth.uid());
$$;
revoke all on function private.shopping_role(uuid) from public;
grant execute on function private.shopping_role(uuid) to authenticated;
create policy room_read on public.shopping_rooms for select to authenticated using (private.shopping_role(id) is not null);
create policy member_read on public.shopping_members for select to authenticated using (private.shopping_role(room_id) is not null);
create policy invite_read on public.shopping_invites for select to authenticated using (private.shopping_role(room_id)='owner');

create function public.create_shopping_room(p_title text,p_memo jsonb,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'LOGIN_REQUIRED'; end if;
 insert into public.shopping_rooms(owner_id,title,memo,updated_by) values(auth.uid(),trim(p_title),p_memo,trim(p_name)) returning id into r;
 insert into public.shopping_members values(r,auth.uid(),'owner',trim(p_name));
 return r;
end $$;
create function public.save_shopping_room(p_id uuid,p_revision integer,p_memo jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare current_revision integer; member_role text; member_name text;
begin
 select revision into current_revision from public.shopping_rooms where id=p_id for update;
 select role,display_name into member_role,member_name from public.shopping_members where room_id=p_id and user_id=auth.uid();
 if member_role is null or member_role not in ('owner','editor') then raise exception 'NO_ACCESS'; end if;
 if current_revision is distinct from p_revision then raise exception 'CONFLICT'; end if;
 update public.shopping_rooms set memo=p_memo,revision=revision+1,updated_at=now(),updated_by=member_name where id=p_id;
 return current_revision+1;
end $$;
create function public.invite_shopping_member(p_id uuid,p_email text,p_role text) returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 perform 1 from public.shopping_rooms where id=p_id for update;
 if private.shopping_role(p_id) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 if p_role not in ('editor','viewer') or length(trim(p_email))>320 or position('@' in p_email)<2 then raise exception 'INVALID_INVITE'; end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.shopping_invites(room_id,email,role,token_hash) values(p_id,lower(trim(p_email)),p_role,encode(sha256(convert_to(token,'UTF8')),'hex'));
 return token;
end $$;
create function public.accept_shopping_invite(p_token text,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation public.shopping_invites; verified_email text; r uuid;
begin
 select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'LOGIN_REQUIRED'; end if;
 select room_id into r from public.shopping_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 perform 1 from public.shopping_rooms where id=r for update;
 select * into invitation from public.shopping_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if invitation.id is null or invitation.revoked or invitation.used_at is not null or invitation.expires_at<now() or invitation.email<>lower(verified_email) then raise exception 'INVALID_INVITE'; end if;
 insert into public.shopping_members values(invitation.room_id,auth.uid(),invitation.role,trim(p_name)) on conflict(room_id,user_id) do nothing;
 update public.shopping_invites set used_at=now() where id=invitation.id;
 return invitation.room_id;
end $$;
create function public.remove_shopping_member(p_id uuid,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.shopping_rooms where id=p_id for update;
 if private.shopping_role(p_id) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 delete from public.shopping_members where room_id=p_id and user_id=p_user and role<>'owner';
end $$;
create function public.revoke_shopping_invite(p_id uuid,p_invite uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.shopping_rooms where id=p_id for update;
 if private.shopping_role(p_id) is distinct from 'owner' then raise exception 'NO_ACCESS'; end if;
 update public.shopping_invites set revoked=true where room_id=p_id and id=p_invite;
end $$;
revoke all on function public.create_shopping_room(text,jsonb,text), public.save_shopping_room(uuid,integer,jsonb), public.invite_shopping_member(uuid,text,text), public.accept_shopping_invite(text,text), public.remove_shopping_member(uuid,uuid), public.revoke_shopping_invite(uuid,uuid) from public,anon;
grant execute on function public.create_shopping_room(text,jsonb,text), public.save_shopping_room(uuid,integer,jsonb), public.invite_shopping_member(uuid,text,text), public.accept_shopping_invite(text,text), public.remove_shopping_member(uuid,uuid), public.revoke_shopping_invite(uuid,uuid) to authenticated;

commit;
