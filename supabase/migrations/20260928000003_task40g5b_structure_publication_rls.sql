-- Task 40G.5B — publication boundary for the Course/Week/Day structure.
--
-- PROBLEM (proven live in 40G.5A)
--   20260920000002 created, for the structure tables:
--       create policy "public_courses_select" on public.courses for select using (true);
--       create policy "public_weeks_select"   on public.weeks   for select using (true);
--       create policy "public_days_select"    on public.days    for select using (true);
--
--   `using (true)` matches every row, so ANY holder of the publishable/anon key
--   could read DRAFT courses, weeks and days. Live probe results before this
--   migration (anon client):
--       courses  published=1  draft=1
--       weeks    published=1  draft=1
--       days     published=1  draft=1
--
--   This was not theoretical. `DashboardClient.tsx` fetches structure with the
--   browser (publishable) client and filters to published in JavaScript
--   *after* the rows have already crossed the network boundary, so unpublished
--   week/day rows were delivered to the browser.
--
-- FIX
--   Replace `using (true)` with the table's real publication condition.
--   `status` is the canonical publication column on all three tables
--   (default 'draft'; constrained to draft|published|archived).
--
--   REMOVED policies:
--       "public_courses_select"   (for select using (true))
--       "public_weeks_select"     (for select using (true))
--       "public_days_select"      (for select using (true))
--   ADDED policies:
--       "public_courses_select"   for select to anon, authenticated using (status = 'published')
--       "public_weeks_select"     for select to anon, authenticated using (status = 'published')
--       "public_days_select"      for select to anon, authenticated using (status = 'published')
--
--   Names are intentionally preserved so any external tooling/pg_policies lookup
--   that referenced the old names keeps resolving.
--
-- HIERARCHY — deliberately NOT encoded here
--   This migration enforces ROW publication independently per table. It does not
--   attempt to express course -> week -> day containment inside RLS. The existing
--   application-level checks in `publishedStructure.ts` and `publishedDay.ts`
--   remain responsible for requiring a published course AND a published week AND
--   a published day, and they stay in place as defence-in-depth.
--
-- SERVICE ROLE IS UNAFFECTED
--   The service role bypasses RLS entirely, so admin tooling keeps full read
--   (and write) access to drafts. That is the 40G.3 pattern, repeated here.
--
-- SCOPE
--   Only these three SELECT policies are touched. No INSERT/UPDATE/DELETE
--   policy, no other table, no column, index or trigger is modified. Questions,
--   assessments, learning_resources and resource_placements are untouched —
--   they are audited separately.

alter table public.courses enable row level security;
alter table public.weeks  enable row level security;
alter table public.days   enable row level security;

drop policy if exists "public_courses_select" on public.courses;
drop policy if exists "public_weeks_select"   on public.weeks;
drop policy if exists "public_days_select"    on public.days;

create policy "public_courses_select" on public.courses
  for select
  to anon, authenticated
  using (status = 'published');

create policy "public_weeks_select" on public.weeks
  for select
  to anon, authenticated
  using (status = 'published');

create policy "public_days_select" on public.days
  for select
  to anon, authenticated
  using (status = 'published');