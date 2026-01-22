-- MASTER FIX: Run this to ensure all recent schema changes are applied

-- 1. Add end_time to bookings
alter table bookings 
add column if not exists end_time timestamp with time zone;

update bookings 
set end_time = start_time + interval '4 hours' 
where end_time is null;

-- 2. Add club_id to bookings
alter table bookings 
add column if not exists club_id uuid references clubs(id);

-- 3. Ensure Notifications table exists
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text not null,
  type text check (type in ('booking_update', 'game_reminder', 'system')),
  is_read boolean default false,
  related_entity_id uuid,
  created_at timestamp with time zone default now()
);

alter table notifications enable row level security;

-- Policies (drop first to avoid conflict)
drop policy if exists "Users can view own notifications" on notifications;
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);

drop policy if exists "Admins can insert notifications" on notifications;
create policy "Admins can insert notifications" on notifications for insert with check (public.is_admin() OR auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);

-- 4. Ensure Tee Sheet RPC handles range
create or replace function get_tee_sheet_range(
  start_dt timestamp with time zone,
  end_dt timestamp with time zone
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
security definer
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
  where b.start_time >= start_dt and b.start_time <= end_dt
  and b.status != 'cancelled' and b.status != 'withdrawn'
  group by b.start_time
  order by b.start_time asc;
end;
$$;
