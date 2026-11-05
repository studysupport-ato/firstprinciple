-- When a course rep swaps in a newer file: students see an "Updated" tag and the note.
alter table public.course_materials add column if not exists replaced_at timestamptz;
alter table public.course_materials add column if not exists change_note text;
