-- Helper function to check admin role using JWT metadata
-- Run this in Supabase SQL Editor to update the function definition
create or replace function public.is_admin()
returns boolean as $$
begin
  -- Check the 'role' field in user_metadata from the JWT
  return (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
end;
$$ language plpgsql security definer;
