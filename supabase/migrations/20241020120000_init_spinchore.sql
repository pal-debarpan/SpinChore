-- SpinChore initial schema
-- Week rule: week_start is always a Monday. A week is Monday–Sunday in UTC.
-- Date boundary: a chore week includes every UTC calendar date from week_start
-- through week_start + 6 days. The application computes "current week" from
-- the UTC date of the request, not from a household-local timezone.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.roommates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  difficulty integer not null check (difficulty between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  created_at timestamptz not null default now(),
  constraint weeks_monday_chk check (extract(isodow from week_start) = 1)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete restrict,
  roommate_id uuid not null references public.roommates (id) on delete restrict,
  chore_id uuid not null references public.chores (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint assignments_week_chore_unique unique (week_id, chore_id)
);

create index assignments_week_id_idx on public.assignments (week_id);
create index assignments_roommate_id_idx on public.assignments (roommate_id);
create index assignments_chore_id_idx on public.assignments (chore_id);
create index assignments_roommate_week_idx on public.assignments (roommate_id, week_id);
create index assignments_completed_at_idx on public.assignments (completed_at);
create index roommates_is_active_idx on public.roommates (is_active);
create index chores_is_active_idx on public.chores (is_active);
create index chores_difficulty_idx on public.chores (difficulty);
create index weeks_week_start_idx on public.weeks (week_start);

create trigger roommates_set_updated_at
before update on public.roommates
for each row execute function public.set_updated_at();

create trigger chores_set_updated_at
before update on public.chores
for each row execute function public.set_updated_at();

-- Lock a week row so concurrent generate requests cannot insert duplicates.
create or replace function public.ensure_week(p_week_start date)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start must be a Monday (UTC)';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_week_start::text, 0));

  select id into v_id from public.weeks where week_start = p_week_start;
  if v_id is null then
    insert into public.weeks (week_start)
    values (p_week_start)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- Atomic replace used only for explicit regeneration of an incomplete week.
create or replace function public.replace_week_assignments(
  p_week_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.assignments
    where week_id = p_week_id
      and completed_at is not null
  ) then
    raise exception 'cannot regenerate a week that already has completions';
  end if;

  delete from public.assignments where week_id = p_week_id;

  insert into public.assignments (week_id, roommate_id, chore_id)
  select
    p_week_id,
    (row_item->>'roommate_id')::uuid,
    (row_item->>'chore_id')::uuid
  from jsonb_array_elements(p_rows) as row_item;
end;
$$;

alter table public.roommates enable row level security;
alter table public.chores enable row level security;
alter table public.weeks enable row level security;
alter table public.assignments enable row level security;

revoke all on public.roommates from anon, authenticated;
revoke all on public.chores from anon, authenticated;
revoke all on public.weeks from anon, authenticated;
revoke all on public.assignments from anon, authenticated;
revoke execute on function public.ensure_week(date) from anon, authenticated;
revoke execute on function public.replace_week_assignments(uuid, jsonb) from anon, authenticated;

comment on table public.weeks is
  'One row per household week. week_start is Monday; the week runs through Sunday, UTC.';
comment on column public.assignments.completed_at is
  'Set once when the chore is completed. Subsequent completion requests must not change this timestamp.';
