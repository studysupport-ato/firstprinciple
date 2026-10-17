-- Grey out a course or a single lesson (day) without unpublishing it.
alter table public.courses add column if not exists coming_soon boolean not null default false;
alter table public.days add column if not exists coming_soon boolean not null default false;
