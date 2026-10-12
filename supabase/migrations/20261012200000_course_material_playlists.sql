-- YouTube playlists as a material type.
--
-- A playlist material stores the playlist link in url. Its videos are read live from YouTube
-- (so videos the channel adds later appear by themselves); hidden_videos lists the video ids
-- the administrator chose not to show students.

alter table public.course_materials
  drop constraint if exists course_materials_material_type_check;
alter table public.course_materials
  add constraint course_materials_material_type_check
    check (material_type is null or material_type in ('pdf', 'slides', 'past_questions', 'video', 'link', 'playlist'));

alter table public.course_materials
  add column if not exists hidden_videos text[] not null default '{}';

comment on column public.course_materials.hidden_videos is 'For a playlist material: YouTube video ids hidden from students.';
