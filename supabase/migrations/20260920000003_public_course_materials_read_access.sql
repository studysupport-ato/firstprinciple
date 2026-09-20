-- ---------------------------------------------------------------------------
-- Public student-facing Course Materials read access
-- ---------------------------------------------------------------------------
-- The browser client must be able to read only the published course-material
-- catalog. This migration adds the missing public policies for the tables that
-- the student route loads via the public Supabase client.

alter table public.departments enable row level security;
alter table public.course_materials enable row level security;

drop policy if exists "public_departments_select" on public.departments;
drop policy if exists "public_course_materials_select" on public.course_materials;

create policy "public_departments_select" on public.departments
  for select using (status = 'published');

create policy "public_course_materials_select" on public.course_materials
  for select using (status = 'published');
