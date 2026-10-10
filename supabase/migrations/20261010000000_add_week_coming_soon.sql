alter table public.weeks
  add column if not exists coming_soon boolean not null default false;

update public.weeks
set coming_soon = true
where id in ('math151-week-4', 'math151-week-5');
