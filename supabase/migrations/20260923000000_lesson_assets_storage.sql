-- Lesson image storage is public-read and server-write only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-assets', 'lesson-assets', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Browser students may read published educational images. Upload/update/delete
-- stays behind the server-side service-role admin boundary.
drop policy if exists "lesson_assets_public_read" on storage.objects;
create policy "lesson_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'lesson-assets');
