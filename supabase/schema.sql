-- =====================================================================
-- Calisthenics Coach — database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again (it skips what already exists).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.levels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text not null,
  phone                text not null unique,
  birth_year           int,
  height_cm            numeric,
  weight_kg            numeric,
  role                 text not null default 'student' check (role in ('student','coach')),
  status               text not null default 'pending' check (status in ('pending','active','rejected','cancelled')),
  level_id             uuid references public.levels(id) on delete set null,
  access_until         timestamptz,
  approved_at          timestamptz,
  renewal_requested_at timestamptz,
  lang                 text not null default 'uz',
  last_active_at       timestamptz,
  created_at           timestamptz not null default now()
);

-- Daily tasks: belong to a level. days = ISO weekdays (1=Mon..7=Sun); null/empty = every day
create table if not exists public.exercises (
  id         uuid primary key default gen_random_uuid(),
  level_id   uuid not null references public.levels(id) on delete cascade,
  name       text not null,
  sets       int  not null default 3,
  reps       text not null default '10',
  days       int[],
  note       text not null default '',
  media_url  text,
  media_type text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- Additional (trainer) tasks: for everyone (both ids null), one level, or one student
create table if not exists public.extra_tasks (
  id         uuid primary key default gen_random_uuid(),
  level_id   uuid references public.levels(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  period     text not null check (period in ('day','week','month')),
  start_date date not null,
  end_date   date not null,
  name       text not null,
  sets       int  not null default 3,
  reps       text not null default '10',
  note       text not null default '',
  media_url  text,
  media_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  task_kind     text not null check (task_kind in ('daily','extra')),
  task_id       uuid not null,
  exercise_name text not null default '',
  log_date      date not null,
  reps_done     int  not null default 0 check (reps_done >= 0),
  note          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_id, task_kind, task_id, log_date)
);
create index if not exists workout_logs_student_date on public.workout_logs (student_id, log_date);

create table if not exists public.skip_requests (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  skip_date  date not null,
  reason     text not null check (length(trim(reason)) > 0),
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  test_date  date not null,
  level_id   uuid references public.levels(id) on delete set null,
  note       text not null default '',
  status     text not null default 'upcoming' check (status in ('upcoming','done')),
  created_at timestamptz not null default now()
);

create table if not exists public.test_exercises (
  id         uuid primary key default gen_random_uuid(),
  test_id    uuid not null references public.tests(id) on delete cascade,
  name       text not null,
  target     text not null default '',
  media_url  text,
  media_type text,
  sort_order int not null default 0
);

create table if not exists public.test_results (
  id               uuid primary key default gen_random_uuid(),
  test_id          uuid not null references public.tests(id) on delete cascade,
  test_exercise_id uuid not null references public.test_exercises(id) on delete cascade,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  value            numeric,
  unique (test_exercise_id, student_id)
);

create table if not exists public.test_outcomes (
  test_id    uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  passed     boolean not null default false,
  promoted   boolean not null default false,
  primary key (test_id, student_id)
);

-- ---------------------------------------------------------------------
-- Helper functions (run with owner rights, so they can read profiles)
-- ---------------------------------------------------------------------

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- True only for the coach, or a student whose 30 days have not run out.
-- This uses the SERVER clock, so changing the phone's date does nothing.
create or replace function public.has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'coach' or (status = 'active' and access_until > now()))
  );
$$;

create or replace function public.my_level() returns uuid
language sql stable security definer set search_path = public as $$
  select level_id from public.profiles where id = auth.uid();
$$;

-- New sign-up → profile row with status 'pending' (students cannot choose their role/status)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, birth_year, height_cm, weight_kg, lang)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'No name'),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), new.id::text),
    nullif(new.raw_user_meta_data->>'birth_year', '')::int,
    nullif(new.raw_user_meta_data->>'height_cm', '')::numeric,
    nullif(new.raw_user_meta_data->>'weight_kg', '')::numeric,
    coalesce(nullif(new.raw_user_meta_data->>'lang', ''), 'uz')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Coach actions
-- ---------------------------------------------------------------------

create or replace function public.coach_approve(p_student uuid, p_level uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'not allowed'; end if;
  update public.profiles
     set status = 'active',
         level_id = coalesce(p_level, level_id),
         access_until = now() + interval '30 days',
         approved_at = now(),
         renewal_requested_at = null
   where id = p_student and role = 'student';
end $$;

-- p_action: 'reset' (30 days from now), 'cancel' (block now), 'reject' (decline sign-up)
create or replace function public.coach_set_access(p_students uuid[], p_action text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'not allowed'; end if;
  if p_action = 'reset' then
    update public.profiles
       set status = 'active', access_until = now() + interval '30 days',
           approved_at = coalesce(approved_at, now()), renewal_requested_at = null
     where id = any(p_students) and role = 'student';
  elsif p_action = 'cancel' then
    update public.profiles
       set status = 'cancelled', access_until = now(), renewal_requested_at = null
     where id = any(p_students) and role = 'student';
  elsif p_action = 'reject' then
    update public.profiles
       set status = 'rejected', renewal_requested_at = null
     where id = any(p_students) and role = 'student';
  else
    raise exception 'unknown action %', p_action;
  end if;
end $$;

create or replace function public.coach_reset_password(p_student uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_coach() then raise exception 'not allowed'; end if;
  if p_password is null or length(p_password) < 6 then raise exception 'password too short'; end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'not a student';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_student;
end $$;

-- Move each selected student up one level (by level order) and record it on the test
create or replace function public.coach_promote(p_test uuid, p_students uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare
  s uuid; next_level uuid; moved int := 0;
begin
  if not public.is_coach() then raise exception 'not allowed'; end if;
  foreach s in array p_students loop
    select l2.id into next_level
      from public.profiles p
      join public.levels l1 on l1.id = p.level_id
      join public.levels l2 on l2.sort_order > l1.sort_order
     where p.id = s
     order by l2.sort_order, l2.created_at
     limit 1;
    if next_level is not null then
      update public.profiles set level_id = next_level where id = s;
      moved := moved + 1;
    end if;
    if p_test is not null then
      insert into public.test_outcomes (test_id, student_id, passed, promoted)
      values (p_test, s, true, next_level is not null)
      on conflict (test_id, student_id) do update set passed = true, promoted = excluded.promoted;
    end if;
    next_level := null;
  end loop;
  return moved;
end $$;

-- Per-student totals for the coach's student list (one row per student)
create or replace function public.coach_student_stats()
returns table (student_id uuid, total_reps bigint, reps_7d bigint, days_30d bigint, last_log date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'not allowed'; end if;
  return query
    select l.student_id,
           coalesce(sum(l.reps_done), 0)::bigint,
           coalesce(sum(l.reps_done) filter (where l.log_date >= current_date - 6), 0)::bigint,
           count(distinct l.log_date) filter (where l.log_date >= current_date - 29)::bigint,
           max(l.log_date)
      from public.workout_logs l
     group by l.student_id;
end $$;

-- ---------------------------------------------------------------------
-- Student actions
-- ---------------------------------------------------------------------

create or replace function public.my_stats()
returns table (total_reps bigint, reps_7d bigint, days_30d bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(reps_done), 0)::bigint,
         coalesce(sum(reps_done) filter (where log_date >= current_date - 6), 0)::bigint,
         count(distinct log_date) filter (where log_date >= current_date - 29)::bigint
    from public.workout_logs where student_id = auth.uid();
$$;

create or replace function public.request_renewal() returns void
language sql security definer set search_path = public as $$
  update public.profiles set renewal_requested_at = now()
   where id = auth.uid() and role = 'student' and status in ('active','cancelled');
$$;

create or replace function public.touch_activity() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_active_at = now() where id = auth.uid();
$$;

create or replace function public.update_my_profile(p_height numeric, p_weight numeric, p_lang text) returns void
language sql security definer set search_path = public as $$
  update public.profiles
     set height_cm = p_height, weight_kg = p_weight,
         lang = case when p_lang in ('uz','ru') then p_lang else lang end
   where id = auth.uid();
$$;

-- Changes the phone number AND the login (login email is built from the phone in the app)
create or replace function public.change_my_phone(p_phone text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_phone !~ '^[0-9]{9,15}$' then raise exception 'bad phone'; end if;
  if exists (select 1 from public.profiles where phone = p_phone and id <> auth.uid())
     or exists (select 1 from auth.users where lower(email) = lower(p_email) and id <> auth.uid()) then
    raise exception 'phone already used';
  end if;
  update auth.users set email = lower(p_email), updated_at = now() where id = auth.uid();
  update auth.identities
     set identity_data = identity_data || jsonb_build_object('email', lower(p_email)),
         updated_at = now()
   where user_id = auth.uid() and provider = 'email';
  update public.profiles set phone = p_phone where id = auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security (who can read / change what)
-- ---------------------------------------------------------------------

alter table public.levels         enable row level security;
alter table public.profiles       enable row level security;
alter table public.exercises      enable row level security;
alter table public.extra_tasks    enable row level security;
alter table public.workout_logs   enable row level security;
alter table public.skip_requests  enable row level security;
alter table public.tests          enable row level security;
alter table public.test_exercises enable row level security;
alter table public.test_results   enable row level security;
alter table public.test_outcomes  enable row level security;

-- levels
drop policy if exists levels_read  on public.levels;
drop policy if exists levels_coach on public.levels;
create policy levels_read  on public.levels for select to authenticated using (true);
create policy levels_coach on public.levels for all    to authenticated using (public.is_coach()) with check (public.is_coach());

-- profiles: you see yourself; coach sees and edits everyone. Students change their data only via functions above.
drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_coach on public.profiles;
create policy profiles_read  on public.profiles for select to authenticated using (id = auth.uid() or public.is_coach());
create policy profiles_coach on public.profiles for update to authenticated using (public.is_coach()) with check (public.is_coach());

-- exercises (daily tasks)
drop policy if exists exercises_read  on public.exercises;
drop policy if exists exercises_coach on public.exercises;
create policy exercises_read  on public.exercises for select to authenticated
  using (public.is_coach() or (public.has_access() and level_id = public.my_level()));
create policy exercises_coach on public.exercises for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- extra tasks
drop policy if exists extra_read  on public.extra_tasks;
drop policy if exists extra_coach on public.extra_tasks;
create policy extra_read  on public.extra_tasks for select to authenticated
  using (public.is_coach() or (public.has_access() and (
          student_id = auth.uid()
          or (student_id is null and (level_id is null or level_id = public.my_level())))));
create policy extra_coach on public.extra_tasks for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- workout logs
drop policy if exists logs_read   on public.workout_logs;
drop policy if exists logs_insert on public.workout_logs;
drop policy if exists logs_update on public.workout_logs;
drop policy if exists logs_coach  on public.workout_logs;
create policy logs_read   on public.workout_logs for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy logs_insert on public.workout_logs for insert to authenticated with check (student_id = auth.uid() and public.has_access());
create policy logs_update on public.workout_logs for update to authenticated
  using (student_id = auth.uid() and public.has_access()) with check (student_id = auth.uid() and public.has_access());
create policy logs_coach  on public.workout_logs for delete to authenticated using (public.is_coach());

-- skip requests
drop policy if exists skips_read   on public.skip_requests;
drop policy if exists skips_insert on public.skip_requests;
drop policy if exists skips_coach  on public.skip_requests;
create policy skips_read   on public.skip_requests for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy skips_insert on public.skip_requests for insert to authenticated with check (student_id = auth.uid() and public.has_access());
create policy skips_coach  on public.skip_requests for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- tests
drop policy if exists tests_read  on public.tests;
drop policy if exists tests_coach on public.tests;
create policy tests_read  on public.tests for select to authenticated
  using (public.is_coach()
         or (public.has_access() and (level_id is null or level_id = public.my_level()))
         or exists (select 1 from public.test_results r where r.test_id = tests.id and r.student_id = auth.uid()));
create policy tests_coach on public.tests for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists test_ex_read  on public.test_exercises;
drop policy if exists test_ex_coach on public.test_exercises;
create policy test_ex_read  on public.test_exercises for select to authenticated using (public.has_access());
create policy test_ex_coach on public.test_exercises for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists results_read  on public.test_results;
drop policy if exists results_coach on public.test_results;
create policy results_read  on public.test_results for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy results_coach on public.test_results for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists outcomes_read  on public.test_outcomes;
drop policy if exists outcomes_coach on public.test_outcomes;
create policy outcomes_read  on public.test_outcomes for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy outcomes_coach on public.test_outcomes for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- ---------------------------------------------------------------------
-- Permissions: signed-in users go through the rules above; anonymous visitors get nothing
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function
  public.is_coach(), public.has_access(), public.my_level(),
  public.coach_approve(uuid, uuid), public.coach_set_access(uuid[], text),
  public.coach_reset_password(uuid, text), public.coach_promote(uuid, uuid[]),
  public.coach_student_stats(), public.my_stats(), public.request_renewal(),
  public.touch_activity(), public.update_my_profile(numeric, numeric, text),
  public.change_my_phone(text, text)
to authenticated;
revoke execute on function
  public.coach_approve(uuid, uuid), public.coach_set_access(uuid[], text),
  public.coach_reset_password(uuid, text), public.coach_promote(uuid, uuid[]),
  public.coach_student_stats(), public.my_stats(), public.request_renewal(),
  public.touch_activity(), public.update_my_profile(numeric, numeric, text),
  public.change_my_phone(text, text)
from anon;

-- ---------------------------------------------------------------------
-- File storage for exercise GIFs / videos (public read, only coach uploads)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608,
        array['image/gif','image/png','image/jpeg','image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;

drop policy if exists media_coach_insert on storage.objects;
drop policy if exists media_coach_update on storage.objects;
drop policy if exists media_coach_delete on storage.objects;
create policy media_coach_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_coach());
create policy media_coach_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_coach()) with check (bucket_id = 'media' and public.is_coach());
create policy media_coach_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_coach());

-- =====================================================================
-- After running this file:
--   1) Sign up in the app with YOUR phone number (as if you were a student).
--   2) Then run this line once, with your number (digits only), to make yourself the coach:
--
--      update public.profiles set role = 'coach', status = 'active' where phone = '998XXXXXXXXX';
-- =====================================================================
