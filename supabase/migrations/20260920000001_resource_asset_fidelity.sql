-- Task 30: reconcile optional domain metadata with the hosted relational model.
alter table public.learning_resources
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.assets
  add column if not exists description text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists duration numeric,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.assets drop constraint if exists assets_type_check;
alter table public.assets add constraint assets_type_check check (type in ('image', 'video', 'document', 'audio', 'other'));