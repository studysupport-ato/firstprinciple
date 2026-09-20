-- ---------------------------------------------------------------------------
-- Public student-facing content read access
-- ---------------------------------------------------------------------------
-- Student pages read the published course catalog and question/assessment content
-- via the public browser client. This migration enables read-only RLS for the
-- content tables that are intentionally exposed to the app.

alter table public.courses enable row level security;
alter table public.weeks enable row level security;
alter table public.days enable row level security;
alter table public.questions enable row level security;
alter table public.assessments enable row level security;
alter table public.learning_resources enable row level security;
alter table public.resource_placements enable row level security;
alter table public.departments enable row level security;
alter table public.course_materials enable row level security;

create policy "public_courses_select" on public.courses
  for select using (true);

create policy "public_weeks_select" on public.weeks
  for select using (true);

create policy "public_days_select" on public.days
  for select using (true);

create policy "public_questions_select" on public.questions
  for select using (true);

create policy "public_assessments_select" on public.assessments
  for select using (true);

create policy "public_learning_resources_select" on public.learning_resources
  for select using (true);

create policy "public_resource_placements_select" on public.resource_placements
  for select using (true);

create policy "public_departments_select" on public.departments
  for select using (status = 'published');

create policy "public_course_materials_select" on public.course_materials
  for select using (status = 'published');
