-- Run once in a NEW Supabase project's SQL Editor.
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

create table public.businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id),
 name text not null check(length(trim(name)) between 1 and 100),
 place_url text not null check(place_url ~ '^https://(map\.naver\.com|m\.place\.naver\.com|pcmap\.place\.naver\.com|place\.naver\.com|naver\.me)/'),
 start_date date not null, created_at timestamptz not null default now()
);
create table public.keywords (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 term text not null check(length(trim(term)) between 1 and 100), unique(business_id,term)
);
create table public.ranks (
 keyword_id uuid not null references public.keywords(id) on delete cascade, date date not null,
 rank integer check(rank between 1 and 100000), location text not null check(length(trim(location)) between 1 and 200),
 surface text not null check(surface in ('모바일 네이버 지도 · 기본 정렬 · 광고 제외','PC 네이버 지도 · 기본 정렬 · 광고 제외')),
 note text not null default '' check(length(note)<=500), source text not null default 'manual' check(source in ('manual','provider')),
 updated_at timestamptz not null default now(), primary key(keyword_id,date)
);
create table public.notices (
 keyword_id uuid not null references public.keywords(id) on delete cascade,
 stage integer not null check(stage between 20 and 25), reached_on date not null, read_at timestamptz,
 primary key(keyword_id,stage)
);
alter table public.businesses enable row level security;
alter table public.keywords enable row level security;
alter table public.ranks enable row level security;
alter table public.notices enable row level security;
create policy business_read on public.businesses for select to authenticated using(public.is_admin() and owner_id=auth.uid());
create policy keyword_read on public.keywords for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create policy rank_read on public.ranks for select to authenticated using(exists(select 1 from public.keywords k where k.id=keyword_id));
create policy notice_read on public.notices for select to authenticated using(exists(select 1 from public.keywords k where k.id=keyword_id));
revoke all on public.businesses,public.keywords,public.ranks,public.notices from anon,authenticated;
grant select on public.businesses,public.keywords,public.ranks,public.notices to authenticated;

-- Serialize every mutation per administrator. Tables have no client write grants.
create function public.lock_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception '관리자 로그인이 필요합니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
end; $$;

create function public.sync_notices(p_business uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 -- A milestone's date is the Nth qualifying date. Changed dates reset read state.
 delete from public.notices n using public.keywords k
 where k.business_id=p_business and n.keyword_id=k.id and n.stage >
 (select count(*) from public.ranks r join public.businesses b on b.id=k.business_id
 where r.keyword_id=k.id and r.rank between 1 and 5 and r.date>=b.start_date and r.date<=(now() at time zone 'Asia/Seoul')::date);
 insert into public.notices(keyword_id,stage,reached_on)
 select keyword_id,seq::integer,date from (
 select r.keyword_id,r.date,row_number() over(partition by r.keyword_id order by r.date) seq
 from public.ranks r join public.keywords k on k.id=r.keyword_id join public.businesses b on b.id=k.business_id
 where b.id=p_business and r.rank between 1 and 5 and r.date>=b.start_date and r.date<=(now() at time zone 'Asia/Seoul')::date
 ) d where seq between 20 and 25
 on conflict(keyword_id,stage) do update set reached_on=excluded.reached_on,
 read_at=case when public.notices.reached_on=excluded.reached_on then public.notices.read_at else null end;
end; $$;

create function public.save_business(p_id uuid,p_name text,p_url text,p_start date,p_terms text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid;
begin
 perform public.lock_admin();
 if p_terms is null or cardinality(p_terms) not between 1 and 50 or exists(select 1 from unnest(p_terms) t where t is null or length(trim(t)) not between 1 and 100)
 or (select count(distinct trim(t)) from unnest(p_terms) t)<>cardinality(p_terms) then raise exception '검색어를 확인해 주세요.'; end if;
 if p_id is null then
 insert into public.businesses(name,place_url,start_date) values(trim(p_name),p_url,p_start) returning id into bid;
 else
 update public.businesses set name=trim(p_name),place_url=p_url,start_date=p_start where id=p_id and owner_id=auth.uid() returning id into bid;
 if bid is null then raise exception '업장을 찾을 수 없습니다.' using errcode='42501'; end if;
 end if;
 delete from public.keywords where business_id=bid and term not in (select trim(t) from unnest(p_terms) t);
 insert into public.keywords(business_id,term) select bid,trim(t) from unnest(p_terms) t on conflict(business_id,term) do nothing;
 perform public.sync_notices(bid);
 return bid;
end; $$;

create function public.delete_business(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.lock_admin();
 delete from public.businesses where id=p_id and owner_id=auth.uid();
 if not found then raise exception '업장을 찾을 수 없습니다.' using errcode='42501'; end if;
end; $$;

create function public.save_rank(p_keyword uuid,p_date date,p_rank integer,p_location text,p_surface text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare bid uuid;
begin
 perform public.lock_admin();
 select b.id into bid from public.businesses b join public.keywords k on k.business_id=b.id where k.id=p_keyword and b.owner_id=auth.uid();
 if bid is null then raise exception '업장을 찾을 수 없습니다.' using errcode='42501'; end if;
 if p_date>(now() at time zone 'Asia/Seoul')::date then raise exception '미래 날짜에는 순위를 입력할 수 없습니다.'; end if;
 insert into public.ranks(keyword_id,date,rank,location,surface,note) values(p_keyword,p_date,p_rank,trim(p_location),p_surface,trim(p_note))
 on conflict(keyword_id,date) do update set rank=excluded.rank,location=excluded.location,surface=excluded.surface,note=excluded.note,source='manual',updated_at=now();
 perform public.sync_notices(bid);
end; $$;

create function public.read_notice(p_keyword uuid,p_stage integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.lock_admin();
 update public.notices n set read_at=now() where n.keyword_id=p_keyword and n.stage=p_stage and exists(
 select 1 from public.keywords k join public.businesses b on b.id=k.business_id where k.id=n.keyword_id and b.owner_id=auth.uid());
 if not found then raise exception '알림을 찾을 수 없습니다.' using errcode='42501'; end if;
end; $$;

-- One consistent database snapshot; avoids the default REST row limit hiding older records.
create function public.dashboard() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'businesses',coalesce((select jsonb_agg(b order by b.created_at) from public.businesses b),'[]'::jsonb),
 'keywords',coalesce((select jsonb_agg(k order by k.term) from public.keywords k),'[]'::jsonb),
 'ranks',coalesce((select jsonb_agg(r order by r.date desc) from public.ranks r),'[]'::jsonb),
 'notices',coalesce((select jsonb_agg(n order by n.reached_on desc,n.stage desc) from public.notices n),'[]'::jsonb));
$$;
revoke all on function public.lock_admin(),public.sync_notices(uuid),public.save_business(uuid,text,text,date,text[]),public.delete_business(uuid),public.save_rank(uuid,date,integer,text,text,text),public.read_notice(uuid,integer),public.dashboard() from public,anon,authenticated;
grant execute on function public.save_business(uuid,text,text,date,text[]),public.delete_business(uuid),public.save_rank(uuid,date,integer,text,text,text),public.read_notice(uuid,integer),public.dashboard() to authenticated;
