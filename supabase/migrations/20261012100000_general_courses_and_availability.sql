-- General courses (shared by every programme) and "not available at the moment".
--
-- General courses live in course_materials like any other course (entry_type 'course', with their
-- materials as children) but under one reserved department, id 'general', with no year or semester.
-- Every course, material and department can be switched to "not available at the moment";
-- students still see it, greyed out, instead of it disappearing.

alter table public.departments
  add column if not exists available boolean not null default true;
alter table public.course_materials
  add column if not exists available boolean not null default true;

insert into public.departments (id, name, short_name, description, order_index, status)
values ('general', 'General courses', 'GEN', 'Courses shared across the College of Engineering', 9999, 'published')
on conflict (id) do nothing;
