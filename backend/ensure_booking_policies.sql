-- Ensure Bookings Table Policies allow inserts
alter table bookings enable row level security;

-- Drop to recreate to be update-safe
drop policy if exists "Users can create their own bookings" on bookings;
drop policy if exists "Users can view their own bookings" on bookings;
drop policy if exists "Admins can manage all bookings" on bookings;

-- User Policies
create policy "Users can create their own bookings"
on bookings for insert
with check (
  auth.uid() = user_id
);

create policy "Users can view their own bookings"
on bookings for select
using (
  auth.uid() = user_id
);

-- Admin Policies (assuming is_admin() function exists)
create policy "Admins can manage all bookings"
on bookings for all
using (
  public.is_admin()
);

-- Grant permissions (just in case)
grant all on bookings to authenticated;
grant all on bookings to service_role;
