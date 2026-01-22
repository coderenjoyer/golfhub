-- Enable the storage extension if not already enabled (usually standard involves storage schema)
-- Create a public bucket named 'avatars' for profile pictures
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Row Level Security Policies for the 'avatars' bucket

-- 1. Everyone can view avatars
create policy "Avatar images are publicly accessible." 
on storage.objects for select 
using ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload an avatar (owner column is auto-populated)
create policy "Users can upload their own avatar." 
on storage.objects for insert 
with check ( 
  bucket_id = 'avatars' 
  and auth.uid() = owner 
);

-- 3. Users can update their own avatar
create policy "Users can update their own avatar." 
on storage.objects for update 
using ( 
  bucket_id = 'avatars' 
  and auth.uid() = owner 
);

-- 4. Users can delete their own avatar
create policy "Users can delete their own avatar." 
on storage.objects for delete 
using ( 
  bucket_id = 'avatars' 
  and auth.uid() = owner 
);
