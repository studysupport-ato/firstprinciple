-- Task 40G.3 — close the public exposure of draft questions.
--
-- PROBLEM
--   20260920000002 created exactly one policy on public.questions:
--       create policy "public_questions_select" ...
--         for select using (true);
--   `using (true)` applies to every row, so ANY client holding the
--   publishable/anon key could `select` every question — including drafts and
--   their `correct_answer` column. The application repositories filtered by
--   status, but that is application-level, not a database boundary, so the
--   publishable key bypassed it entirely by querying PostgREST directly.
--
-- FIX
--   Replace `using (true)` with the table's real publication condition.
--   `status` is the canonical publication field on public.questions
--   (default 'published'); there is no separate `visibility` column.
--
--   REMOVED policy: "public_questions_select"        (for select using (true))
--   ADDED   policy: "public_questions_select_published"
--       for select to anon, authenticated using (status = 'published')
--
-- ADMIN ACCESS IS DELIBERATELY NOT GRANTED HERE
--   There is no authenticated-draft policy on purpose. Authoring already runs
--   through the server-only service-role repository
--   (lib/content/adminRepository.ts -> createQuestionAdminRepository), which
--   bypasses RLS; that is the existing admin authorization model. The
--   `admin_users` table is not referenced by any RLS policy in this
--   repository, and adding a role-based policy would introduce a second,
--   unwired admin authorization system.
--
--   Likewise no policy is granted for `?preview=1`: that is a browser-side
--   URL flag, not a security boundary. Draft preview for admins continues to
--   work through the service-role path.
--
-- SCOPE
--   Only public.questions SELECT policies are touched. No table definition,
--   column, index, trigger or other table's policy is modified.

alter table public.questions enable row level security;

drop policy if exists "public_questions_select" on public.questions;

create policy "public_questions_select_published" on public.questions
  for select
  to anon, authenticated
  using (status = 'published');