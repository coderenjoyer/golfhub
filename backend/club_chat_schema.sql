-- Create Clubs Table (Physical Venues)
create table if not exists clubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text, -- URL to image
  address text,
  is_private boolean default false,
  verification_code text, -- Only checked if is_private = true
  created_at timestamp with time zone default now()
);

-- Club Memberships
create table if not exists club_memberships (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  role text default 'member', -- 'member', 'admin'
  joined_at timestamp with time zone default now(),
  
  unique(club_id, user_id)
);

-- Club Messages (Chat)
create table if not exists club_messages (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- RLS Policies

-- Clubs: Public read, Admin write (Managed by Super Admin usually, or Club Admin)
alter table clubs enable row level security;
drop policy if exists "Clubs are viewable by everyone." on clubs;
create policy "Clubs are viewable by everyone." on clubs for select using (true);

-- (Assuming super admin or similar can create clubs - using public.is_admin function from previous step)
drop policy if exists "Admins can manage clubs." on clubs;
create policy "Admins can manage clubs." on clubs for all using (public.is_admin());

-- Memberships:
alter table club_memberships enable row level security;
drop policy if exists "Users can view their own memberships." on club_memberships;
create policy "Users can view their own memberships." on club_memberships for select using (true);
-- (Allowing select true for now so users can see 'who is in the club' or count members easily, 
--  otherwise strictly auth.uid() = user_id if privacy is strict)

drop policy if exists "Users can join public clubs." on club_memberships;
create policy "Users can join public clubs." on club_memberships for insert with check (auth.uid() = user_id);

drop policy if exists "Users can leave clubs." on club_memberships;
create policy "Users can leave clubs." on club_memberships for delete using (auth.uid() = user_id);

-- Messages:
alter table club_messages enable row level security;
drop policy if exists "Club members can view messages." on club_messages;
create policy "Club members can view messages." on club_messages for select using (
  exists (
    select 1 from club_memberships cm 
    where cm.club_id = club_messages.club_id 
    and cm.user_id = auth.uid()
  )
);

drop policy if exists "Club members can send messages." on club_messages;
create policy "Club members can send messages." on club_messages for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from club_memberships cm 
    where cm.club_id = club_messages.club_id 
    and cm.user_id = auth.uid()
  )
);

-- Seed Data (Optional - useful for demo)
insert into clubs (name, address, logo_url) values 
('Cebu Country Club', 'Banilad, Cebu City', 'https://placehold.co/200x200/2E8B57/white?text=CCC'),
('Mactan Island Golf Club', 'Lapu-Lapu City', 'https://placehold.co/200x200/1E90FF/white?text=MIGC'),
('Alta Vista Golf', 'Pardo, Cebu City', 'https://placehold.co/200x200/FFD700/black?text=AVG')
on conflict do nothing;
