create extension if not exists pg_trgm;

create index if not exists students_admin_directory_order_idx
  on public.students (created_at desc, id desc);

create index if not exists students_admin_directory_name_trgm_idx
  on public.students using gin (display_name gin_trgm_ops);

create index if not exists students_admin_directory_email_trgm_idx
  on public.students using gin (email gin_trgm_ops);

create index if not exists students_admin_directory_phone_trgm_idx
  on public.students using gin (phone_number gin_trgm_ops);
