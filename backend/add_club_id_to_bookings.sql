-- Add club_id to bookings table to track where the game is played
alter table bookings 
add column if not exists club_id uuid references clubs(id);

-- Optional: Update existing bookings to a default club if needed, or leave null
