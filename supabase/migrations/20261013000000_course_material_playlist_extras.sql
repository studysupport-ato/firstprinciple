-- Editing an imported playlist: videos the administrator added on top of the YouTube playlist.
-- Each item is {"videoId": "...", "title": "..."}; they show after the playlist's own videos.

alter table public.course_materials
  add column if not exists extra_videos jsonb not null default '[]'::jsonb;

comment on column public.course_materials.extra_videos is 'For a playlist material: extra YouTube videos [{videoId, title}] shown after the playlist''s own videos.';
