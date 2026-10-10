alter table public.course_materials
  add column study_year smallint;

alter table public.course_materials
  add constraint course_materials_study_year_check
  check (study_year is null or study_year between 1 and 4);

comment on column public.course_materials.study_year is
  'Explicit academic year classification assigned by an administrator; null means not yet classified.';
