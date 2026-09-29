-- Audio Journal schema. Every row is private to its owner via RLS.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  base_look text not null,
  state jsonb not null,
  level int not null default 1,
  xp int not null default 0,
  updated_at timestamptz not null default now()
);

create type public.entry_status as enum ('recorded', 'processing', 'done', 'failed');

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  audio_path text,
  duration_s int not null default 0,
  transcript text not null default '',
  summary text,
  mood smallint check (mood between -2 and 2),
  themes text[] not null default '{}',
  needs_support boolean not null default false,
  status public.entry_status not null default 'recorded',
  created_at timestamptz not null default now()
);

create index entries_user_created_idx on public.entries (user_id, created_at desc);

create table public.character_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid not null unique references public.entries (id) on delete cascade,
  diff jsonb not null,
  chapter text not null,
  created_at timestamptz not null default now()
);

create index character_events_user_created_idx on public.character_events (user_id, created_at);

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.entries enable row level security;
alter table public.character_events enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own character" on public.characters
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own entries" on public.entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own character events" on public.character_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile row on sign up
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private audio bucket, files live under <user_id>/<entry_id>.<ext>
insert into storage.buckets (id, name, public)
values ('journal-audio', 'journal-audio', false)
on conflict (id) do nothing;

create policy "own audio read" on storage.objects
  for select using (bucket_id = 'journal-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio insert" on storage.objects
  for insert with check (bucket_id = 'journal-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio delete" on storage.objects
  for delete using (bucket_id = 'journal-audio' and (storage.foldername(name))[1] = auth.uid()::text);
