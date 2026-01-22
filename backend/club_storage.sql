-- Create a public bucket named 'club_assets' for club logos and images
insert into storage.buckets (id, name, public)
values ('club_assets', 'club_assets', true)
on conflict (id) do nothing;

-- Row Level Security Policies for the 'club_assets' bucket

-- 1. Everyone can view club assets
create policy "Club assets are publicly accessible." 
on storage.objects for select 
using ( bucket_id = 'club_assets' );

-- 2. Only Admins can upload club assets
-- We use the public.is_admin() function defined in tournament_schema.sql
drop policy if exists "Admins can upload club assets." on storage.objects;
create policy "Admins can upload club assets." 
on storage.objects for insert 
with check ( 
  bucket_id = 'club_assets' 
  and public.is_admin() 
);

-- 3. Only Admins can update club assets
drop policy if exists "Admins can update club assets." on storage.objects;
create policy "Admins can update club assets." 
on storage.objects for update 
using ( 
  bucket_id = 'club_assets' 
  and public.is_admin() 
);

-- 4. Only Admins can delete club assets
drop policy if exists "Admins can delete club assets." on storage.objects;
create policy "Admins can delete club assets." 
on storage.objects for delete 
using ( 
  bucket_id = 'club_assets' 
  and public.is_admin() 
);
