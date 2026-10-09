-- Task 40G.7B-FINAL — publication boundary for public.assets.
--
-- PROBLEM (proven live in 40G.7)
--   public.assets was never covered by any migration:
--       20260919000000_initial_schema.sql        -> creates the table only
--       20260920000001_resource_asset_fidelity.sql -> adds columns/constraints
--       20260923000000_lesson_assets_storage.sql  -> policies storage.objects ONLY
--                                                 (the `lesson-assets` bucket), and
--                                                 says nothing about public.assets
--
--   So the table had no `enable row level security` and no SELECT policy in the
--   repository at all. The live database's deny-all behaviour was therefore an
--   undocumented property of the database rather than something reproducible
--   from migrations: a fresh environment replaying this history would build a
--   world-readable assets table.
--
-- FIX
--
--   `assets` carries a real `status` column constrained to draft|ready|archived
--   (assets_status_check). The application layer does NOT filter student reads
--   on it — `listAssets`/`getAsset`/`getAssetsByIds` deliberately do no status
--   filtering — so the boundary belongs in the policy, exactly as 40G.3/40G.5B
--   and 40G.6B did for their tables.
--
--     ADDED: "public_assets_select_ready" for select to anon, authenticated
--            using (status = 'ready')
--
-- SCOPE (deliberately minimal)
--
--   * SELECT only. No INSERT/UPDATE/DELETE policy is created, so anon and
--     authenticated remain unable to write assets. Admin authoring keeps using
--     the service-role client, which bypasses RLS.
--   * The storage bucket `lesson-assets` and its `lesson_assets_public_read`
--     policy are untouched. This migration is scoped to public.assets alone.
--   * No column, constraint, index or trigger is altered. No status vocabulary
--     is introduced or changed; `ready` already existed.
--   * The policy name is kept exactly `public_assets_select_ready`.
--
--   Applying this to the current database is safe and idempotent: it enables RLS
--   (already enabled) and recreates the identical policy.

alter table public.assets enable row level security;

drop policy if exists "public_assets_select_ready" on public.assets;

create policy "public_assets_select_ready"
on public.assets
for select
to anon, authenticated
using (status = 'ready');