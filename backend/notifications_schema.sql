create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text not null,
  type text check (type in ('booking_update', 'game_reminder', 'system')),
  is_read boolean default false,
  related_entity_id uuid, -- e.g., booking_id
  created_at timestamp with time zone default now()
);

-- RLS
alter table notifications enable row level security;

-- Users can view their own notifications
create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

-- Admins can insert notifications (for approvals)
create policy "Admins can insert notifications" on notifications
  for insert with check (
    -- Allow admins to insert for anyone
    public.is_admin() 
    OR 
    -- Allow users to insert their own (for local reminders logic)
    auth.uid() = user_id
  );

-- Users can update their own notifications (to mark as read)
create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);
