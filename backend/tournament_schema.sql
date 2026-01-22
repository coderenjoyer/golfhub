-- Helper function to check admin role
-- Must be defined BEFORE policies that use it
create or replace function public.is_admin()
returns boolean as $$
begin
  -- Check the 'role' field in user_metadata from the JWT
  return (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
end;
$$ language plpgsql security definer;

-- Create Tournaments Table
create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null,
  start_time time, -- e.g. '07:00'
  max_participants integer,
  format text, -- e.g. 'Stroke Play', 'Stableford'
  registration_fee numeric,
  banner_url text,
  status text default 'upcoming', -- 'upcoming', 'open', 'closed', 'active', 'completed'
  created_at timestamp with time zone default now(),  
  updated_at timestamp with time zone default now()
);

-- Create Tournament Participants Table
create table if not exists tournament_participants (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  
  -- Snapshot of handicap at registration time
  handicap_snapshot numeric,
  
  -- Grouping/Flights
  flight_number integer, -- e.g. Flight 1, Flight 2...
  tee_time time, -- assigned start time for this group

  -- Payment
  payment_status text default 'pending', -- 'pending', 'paid'
  
  -- Scores (Simplified for now to total, can expand to per-hole later)
  gross_score integer,
  net_score integer,
  
  created_at timestamp with time zone default now(),
  
  -- Prevent duplicate registration
  unique(tournament_id, user_id)
);

-- Create Tournament Scores (Per Hole) - Optional detailed table for valid leaderboard
create table if not exists tournament_scores (
  id uuid default gen_random_uuid() primary key,
  participant_id uuid references tournament_participants(id) on delete cascade not null,
  hole_number integer not null check (hole_number >= 1 and hole_number <= 18),
  score integer not null,
  
  unique(participant_id, hole_number)
);

-- RLS Policies

-- Tournaments: Public read, Admin write
alter table tournaments enable row level security;
drop policy if exists "Tournaments are viewable by everyone." on tournaments;
create policy "Tournaments are viewable by everyone." on tournaments for select using (true);

drop policy if exists "Admins can insert tournaments." on tournaments;
create policy "Admins can insert tournaments." on tournaments for insert with check (public.is_admin());

drop policy if exists "Admins can update tournaments." on tournaments;
create policy "Admins can update tournaments." on tournaments for update using (public.is_admin());

drop policy if exists "Admins can delete tournaments." on tournaments;
create policy "Admins can delete tournaments." on tournaments for delete using (public.is_admin());

-- Participants: Public read, User insert (register), Admin update
alter table tournament_participants enable row level security;
drop policy if exists "Participants are viewable by everyone." on tournament_participants;
create policy "Participants are viewable by everyone." on tournament_participants for select using (true);

drop policy if exists "Users can register themselves." on tournament_participants;
create policy "Users can register themselves." on tournament_participants for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can manage participants." on tournament_participants;
create policy "Admins can manage participants." on tournament_participants for all using (public.is_admin());
