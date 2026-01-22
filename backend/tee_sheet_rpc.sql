-- Improved Tee Sheet RPC using timestamp range for better timezone handling
create or replace function get_tee_sheet_range(
  start_dt timestamp with time zone,
  end_dt timestamp with time zone
)
returns table (
  slot_time timestamp with time zone,
  booked_count bigint,
  is_user_booked boolean,
  user_booking_status booking_status,
  user_booking_id uuid,
  user_admin_note text,
  user_proposed_time timestamp with time zone
)
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  return query
  select 
    b.start_time as slot_time, 
    sum(case when b.status != 'rejected' then b.player_count else 0 end) as booked_count,
    bool_or(b.user_id = current_user_id) as is_user_booked,
    max(case when b.user_id = current_user_id then b.status else null end) as user_booking_status,
    max(case when b.user_id = current_user_id then b.id::text else null end)::uuid as user_booking_id,
    max(case when b.user_id = current_user_id then b.admin_note else null end) as user_admin_note,
    max(case when b.user_id = current_user_id then b.proposed_time else null end) as user_proposed_time
  from bookings b
  where b.start_time >= start_dt and b.start_time <= end_dt
  and b.status != 'cancelled' and b.status != 'withdrawn'
  group by b.start_time
  order by b.start_time asc;
end;
$$;
