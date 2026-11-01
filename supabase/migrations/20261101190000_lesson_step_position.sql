-- Where a student is in a lesson, so reopening it (on any device) goes straight back to that step.
--   last_step      index of the step the student was last on (0 = the first step)
--   max_step       index of the furthest step reached
--   step_saved_at  when last_step was saved, to pick the newer of this and the device's own copy
-- Written by the student's own session; the existing student_day_progress RLS policies
-- (select/insert/update own rows) already cover these columns.
alter table public.student_day_progress
  add column if not exists last_step integer check (last_step is null or last_step >= 0),
  add column if not exists max_step integer check (max_step is null or max_step >= 0),
  add column if not exists step_saved_at timestamptz;
