-- Name of the course rep who uploaded a material, shown to students as credit.
alter table public.course_materials add column if not exists uploaded_by text;
update public.course_materials m set uploaded_by = a.full_name from public.course_rep_applications a where m.created_by_rep = a.id and m.uploaded_by is null;
