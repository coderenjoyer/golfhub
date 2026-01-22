-- Ensure Tables Exist
create table if not exists clubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  address text,
  is_private boolean default false,
  verification_code text,
  created_at timestamp with time zone default now()
);

create table if not exists club_memberships (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  role text default 'member',
  joined_at timestamp with time zone default now(),
  unique(club_id, user_id)
);

create table if not exists club_messages (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table clubs enable row level security;
alter table club_memberships enable row level security;
alter table club_messages enable row level security;

-- Policies

-- 1. Clubs: Everyone can see clubs (to join them)
drop policy if exists "Clubs are viewable by everyone" on clubs;
create policy "Clubs are viewable by everyone" on clubs for select using (true);

-- 2. Memberships: Users can see their own memberships, and memberships of clubs they are in (to see other members - optional, but good for 'user list')
-- For strict "only see my own membership" to list "My Clubs":
drop policy if exists "Users can view own memberships" on club_memberships;
create policy "Users can view own memberships" on club_memberships for select using (auth.uid() = user_id);

-- Users can join (insert)
drop policy if exists "Users can join clubs" on club_memberships;
create policy "Users can join clubs" on club_memberships for insert with check (auth.uid() = user_id);

-- 3. Messages: STRICT PRIVACY
-- View: Only if you are a member of the club
drop policy if exists "Members can view messages" on club_messages;
create policy "Members can view messages" on club_messages for select using (
  exists (
    select 1 from club_memberships cm
    where cm.club_id = club_messages.club_id
    and cm.user_id = auth.uid()
  )
);

-- Insert: Only if you are a member
drop policy if exists "Members can send messages" on club_messages;
create policy "Members can send messages" on club_messages for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from club_memberships cm
    where cm.club_id = club_messages.club_id
    and cm.user_id = auth.uid()
  )
);

-- Seed some clubs if empty
insert into clubs (name, address, logo_url)
select 'Cebu Country Club', 'Banilad, Cebu City', 'https://placehold.co/200x200/2E8B57/white?text=CCC'
where not exists (select 1 from clubs limit 1);

insert into clubs (name, address, logo_url)
select 'Mactan Island Golf Club', 'Lapu-Lapu City', 'https://placehold.co/200x200/1E90FF/white?text=MIGC'
where not exists (select 1 from clubs where name = 'Mactan Island Golf Club');
