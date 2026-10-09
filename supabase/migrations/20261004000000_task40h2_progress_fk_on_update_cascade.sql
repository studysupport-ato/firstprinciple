-- Task 40H.2 — transfer a Day between Weeks without breaking student progress.
--
-- student_day_progress references days via the composite FK
--   (course_id, week_id, day_id) -> days (course_id, week_id, id)
-- with the default ON UPDATE NO ACTION, which made any UPDATE of days.week_id
-- fail (FK 23503) whenever progress rows referenced the Day — i.e. the whole
-- transfer feature was blocked for any Day a student had opened.
--
-- ON UPDATE CASCADE lets a Day change Weeks while every progress row keeps
-- pointing at the SAME Day id (student_id + day_id primary key unchanged) and
-- simply tracks the Day's new week. ON DELETE CASCADE behavior is unchanged.
-- This does NOT weaken UNIQUE (week_id, order_index) on days, and it does not
-- change any RLS policy.

alter table public.student_day_progress
  drop constraint student_day_progress_day_fkey;

alter table public.student_day_progress
  add constraint student_day_progress_day_fkey
  foreign key (course_id, week_id, day_id)
  references public.days (course_id, week_id, id)
  on update cascade
  on delete cascade;
