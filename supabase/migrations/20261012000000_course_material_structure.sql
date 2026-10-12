-- Course Materials structure: programme > year > semester > course > materials.
--
-- Every row in course_materials is now one of three things (entry_type):
--   'course'         a course an administrator created under a year and a semester (it has no link of its own)
--   'material'       a PDF / slides / past questions / video / link that sits inside a course (parent_id)
--   'semester_link'  the one exception: an external link shown at semester level, beside the courses
-- Rows that already exist keep working. They have entry_type 'material' and no parent, and students
-- still see them; the admin can move each one into a course later.

alter table public.course_materials
  add column if not exists entry_type text not null default 'material',
  add column if not exists material_type text,
  add column if not exists semester smallint,
  add column if not exists parent_id text;

alter table public.course_materials
  add constraint course_materials_entry_type_check
    check (entry_type in ('course', 'material', 'semester_link')),
  add constraint course_materials_material_type_check
    check (material_type is null or material_type in ('pdf', 'slides', 'past_questions', 'video', 'link')),
  add constraint course_materials_semester_check
    check (semester is null or semester in (1, 2)),
  add constraint course_materials_parent_id_fkey
    foreign key (parent_id) references public.course_materials (id) on delete cascade;

-- A course has no link of its own.
alter table public.course_materials alter column url drop not null;

-- The old rules assumed one link per department and one row per course code + title.
-- A course now owns many materials, and the same video can sit in two courses.
alter table public.course_materials drop constraint if exists course_materials_department_url_key;
drop index if exists public.course_materials_department_code_title_key;
create unique index if not exists course_materials_scope_url_key
  on public.course_materials (department_id, coalesce(parent_id, ''), coalesce(study_year, 0), coalesce(semester, 0), url)
  where url is not null;

create index if not exists course_materials_parent_idx on public.course_materials (parent_id);
create index if not exists course_materials_structure_idx
  on public.course_materials (department_id, study_year, semester, entry_type);

comment on column public.course_materials.entry_type is 'course | material | semester_link';
comment on column public.course_materials.parent_id is 'For a material: the course row it belongs to.';
