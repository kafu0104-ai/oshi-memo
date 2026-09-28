begin;
create table public.personal_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=10000000),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.personal_snapshots enable row level security;
revoke all on public.personal_snapshots from anon, authenticated;
grant select on public.personal_snapshots to authenticated;
create policy personal_owner_read on public.personal_snapshots for select to authenticated using(auth.uid()=user_id);
create function public.save_personal_snapshot(p_payload jsonb,p_revision integer) returns integer
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); next_revision integer;
begin
 if owner_id is null or not exists(select 1 from auth.users where id=owner_id and is_anonymous is not true) then raise exception 'LOGIN_REQUIRED'; end if;
 if p_revision is null or p_revision<0 or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000000 then raise exception 'INVALID_SNAPSHOT'; end if;
 if p_revision=0 then
  insert into public.personal_snapshots(user_id,payload) values(owner_id,p_payload) on conflict(user_id) do nothing returning revision into next_revision;
 else
  update public.personal_snapshots set payload=p_payload,revision=revision+1,updated_at=now() where user_id=owner_id and revision=p_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'SYNC_CONFLICT'; end if;
 return next_revision;
end;
$$;
revoke all on function public.save_personal_snapshot(jsonb,integer) from public,anon;
grant execute on function public.save_personal_snapshot(jsonb,integer) to authenticated;
commit;
