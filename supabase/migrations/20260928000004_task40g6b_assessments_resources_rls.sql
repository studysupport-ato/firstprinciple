-- Task 40G.6B — publication boundary for assessments, learning resources and
-- resource placements.
--
-- PROBLEM (proven live in 40G.6 with an anon/publishable-key client)
--   20260920000002 created, for these three tables:
--       create policy "public_assessments_select"          ... for select using (true);
--       create policy "public_learning_resources_select"   ... for select using (true);
--       create policy "public_resource_placements_select"  ... for select using (true);
--
--   `using (true)` matches every row, so the publishable key could read:
--       assessments         -> draft rows INCLUDING the `blueprint` jsonb
--                              (topic rules + question counts = assessment design)
--       learning_resources  -> draft rows INCLUDING `data` (external/YouTube/GeoGebra
--                              payloads) and `metadata` (admin notes). Note this table
--                              DEFAULTS to status='draft'.
--       resource_placements -> placements referencing unpublished resources and days.
--
--   These are the same conditions hardened for questions in 40G.3 and for the
--   Course/Week/Day structure in 40G.5B.
--
-- FIX
--
--   assessments + learning_resources
--     Both carry a real `status` column constrained to
--     draft|published|archived, and the application layer already filters student
--     reads on exactly that column. The policy mirrors it.
--
--     REMOVED: "public_assessments_select"         (for select using (true))
--     REMOVED: "public_learning_resources_select"  (for select using (true))
--     ADDED:   "public_assessments_select"         to anon, authenticated using (status = 'published')
--     ADDED:   "public_learning_resources_select"  to anon, authenticated using (status = 'published')
--
--   resource_placements
--     This table has NO status column. Verified schema semantics:
--       resource_id text NOT NULL  -> FK learning_resources(id) ON DELETE CASCADE
--       course_id / week_id / day_id are NULLABLE, with
--       resource_placements_single_target_check:
--         ((course_id is not null)::int + (week_id is not null)::int
--          + (day_id is not null)::int) = 1
--     i.e. EXACTLY ONE target is populated per row and the other two are NULL.
--     A row is therefore a Course-level, Week-level OR Day-level placement — never
--     more than one.
--
--     So the predicate must NOT require all three parents, and must not let a row
--     become visible through an unrelated parent. The explicit IS NOT NULL guards
--     below make the level unambiguous rather than relying on NULL comparison:
--
--       referenced resource must be published
--       AND the ONE populated target must be published (course OR week OR day)
--
--     REMOVED: "public_resource_placements_select" (for select using (true))
--     ADDED:   "public_resource_placements_select" with the predicate below.
--
--     Correlated EXISTS mirrors the pattern already used for the student-owned
--     progress tables in 40B, so no new publication model is introduced.
--
-- SERVICE ROLE IS UNAFFECTED
--   The service role bypasses RLS, so admin authoring, seeding and verification
--   keep full read/write access to drafts.
--
-- SCOPE
--   Only these three SELECT policies are touched. No INSERT/UPDATE/DELETE policy,
--   no other table, no column, constraint, index or trigger is modified.

alter table public.assessments          enable row level security;
alter table public.learning_resources   enable row level security;
alter table public.resource_placements  enable row level security;

drop policy if exists "public_assessments_select"         on public.assessments;
drop policy if exists "public_learning_resources_select"  on public.learning_resources;
drop policy if exists "public_resource_placements_select" on public.resource_placements;

create policy "public_assessments_select" on public.assessments
  for select
  to anon, authenticated
  using (status = 'published');

create policy "public_learning_resources_select" on public.learning_resources
  for select
  to anon, authenticated
  using (status = 'published');

create policy "public_resource_placements_select" on public.resource_placements
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.learning_resources r
      where r.id = resource_placements.resource_id
        and r.status = 'published'
    )
    and (
      (
        resource_placements.course_id is not null
        and exists (
          select 1 from public.courses c
          where c.id = resource_placements.course_id
            and c.status = 'published'
        )
      )
      or (
        resource_placements.week_id is not null
        and exists (
          select 1 from public.weeks w
          where w.id = resource_placements.week_id
            and w.status = 'published'
        )
      )
      or (
        resource_placements.day_id is not null
        and exists (
          select 1 from public.days d
          where d.id = resource_placements.day_id
            and d.status = 'published'
        )
      )
    )
  );