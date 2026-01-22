-- Create an Enum for Booking Status
create type booking_status as enum ('pending', 'confirmed', 'rejected', 'proposed', 'withdrawn', 'cancelled');

-- Create Bookings Table
create table bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- The exact time of the tee time (e.g., 2023-10-27 08:00:00+00)
  -- We assume standard slots (e.g., every 15 mins).
  start_time timestamp with time zone not null,
  
  -- How many slots this user is occupying (usually 1, unless bringing guests)
  player_count integer default 1 check (player_count >= 1 and player_count <= 4),
  
  status booking_status default 'pending',
  
  -- User's note to admin
  user_note text,
  
  -- Admin's response or rejection reason
  admin_note text,
  
  -- If Admin proposes a new time, it goes here
  proposed_time timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index bookings_user_id_idx on bookings(user_id);
create index bookings_start_time_idx on bookings(start_time);

-- RLS Policies
alter table bookings enable row level security;

-- 1. Users can view their own bookings
create policy "Users can view own bookings" on bookings
  for select using (auth.uid() = user_id);

-- 2. Users can insert bookings for themselves
create policy "Users can create bookings" on bookings
  for insert with check (auth.uid() = user_id);

-- 3. Users can update their own bookings (e.g., to withdraw or accept proposal)
create policy "Users can update own bookings" on bookings
  for update using (auth.uid() = user_id);

-- 4. To allow users to see "Course Load" (colored dots) or "Tee Sheet" availability,
-- they technically need to know *counts* of bookings for other times, but not *who* is playing (privacy).
-- We can create a secure View or function for this, or allow public read on `start_time` and `status` only.
-- For simplicity in this iteration, we might allow reading all bookings but the UI will hide names. 
-- However, strict privacy is better. 
-- Let's create a Postgres/Supabase RPC function to get availability for a date range without exposing user data.

create or replace function get_monthly_load(
  start_date timestamp with time zone,
  end_date timestamp with time zone
) 
returns table (
  day timestamp with time zone,
  total_players bigint
) 
language plpgsql
as $$
begin
  return query
  select date_trunc('day', b.start_time) as day, sum(b.player_count) as total_players
  from bookings b
  where b.start_time >= start_date and b.start_time <= end_date
  and b.status in ('confirmed', 'pending') -- Count pending too for load?
  group by 1;
end;
$$ security definer;

create or replace function get_tee_sheet(
  target_date date
)
returns table (
  slot_time timestamp with time zone,
  booked_count bigint,
  is_user_booked boolean,
  user_booking_status booking_status,
  user_booking_id uuid,
  user_admin_note text,
  user_proposed_time timestamp with time zone
)
language plpgsql
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  return query
  select 
    b.start_time as slot_time, 
    sum(case when b.status != 'rejected' then b.player_count else 0 end) as booked_count,
    bool_or(b.user_id = current_user_id) as is_user_booked,
    max(case when b.user_id = current_user_id then b.status else null end) as user_booking_status,
    max(case when b.user_id = current_user_id then b.id::text else null end)::uuid as user_booking_id,
    max(case when b.user_id = current_user_id then b.admin_note else null end) as user_admin_note,
    max(case when b.user_id = current_user_id then b.proposed_time else null end) as user_proposed_time
  from bookings b
  where date_trunc('day', b.start_time) = target_date
  and b.status != 'cancelled' and b.status != 'withdrawn'
  group by b.start_time
  order by b.start_time asc;
end;
$$ security definer;
