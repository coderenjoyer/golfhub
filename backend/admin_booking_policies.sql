-- Allow Admins to view all bookings
drop policy if exists "Admins can view all bookings" on bookings;
create policy "Admins can view all bookings" on bookings
  for select using (public.is_admin());

-- Allow Admins to update bookings (to change status)
drop policy if exists "Admins can update bookings" on bookings;
create policy "Admins can update bookings" on bookings
  for update using (public.is_admin());
