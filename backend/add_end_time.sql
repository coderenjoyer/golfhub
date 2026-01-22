-- Add end_time column to bookings table
alter table bookings 
add column if not exists end_time timestamp with time zone;

-- Update existing bookings to have a default duration (e.g. 4 hours) if null
update bookings 
set end_time = start_time + interval '4 hours' 
where end_time is null;
