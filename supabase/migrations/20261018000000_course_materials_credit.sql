-- Credit for whoever wrote or compiled a course's materials (shown on the course tile).
alter table public.course_materials add column if not exists credit text;
