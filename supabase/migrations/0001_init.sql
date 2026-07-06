-- once-more: initial schema
-- Events are owned by ambassadors (auth.users). Participants and photos are
-- anonymous rows only ever touched by the server with the secret key, so they
-- get RLS enabled with no public policies.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ambassador_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  location text,
  starts_at timestamptz,
  cover_url text,
  luma_url text,
  shots_per_person int not null default 5 check (shots_per_person between 1 and 100),
  film_filter boolean not null default true,
  watermark_path text,
  revealed boolean not null default false,
  revealed_at timestamptz
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  display_name text not null,
  token uuid not null unique default gen_random_uuid()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  original_path text not null,
  blurred_path text not null,
  revealed_path text
);

create index photos_event_idx on public.photos (event_id, created_at);
create index photos_participant_idx on public.photos (participant_id);
create index participants_event_idx on public.participants (event_id);

alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.photos enable row level security;

-- Ambassadors manage their own events through the user-scoped client.
create policy "ambassadors manage own events"
  on public.events
  for all
  to authenticated
  using (auth.uid() = ambassador_id)
  with check (auth.uid() = ambassador_id);

-- participants/photos have no anon/authenticated policies on purpose:
-- every read/write goes through server routes using the secret key,
-- which is how the blur-until-reveal rule is enforced.

-- Private storage buckets. All object access is server-mediated.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('watermarks', 'watermarks', false)
on conflict (id) do nothing;
