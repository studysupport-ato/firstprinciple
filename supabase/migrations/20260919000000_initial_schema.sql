-- ============================================================================
-- Back2Basics with Kwamina — initial schema (Task 25)
-- Implements the approved Task 24 design (docs/task-24-backend-readiness-audit.md)
--
-- Scope of this migration:
--   * 16 tables, constraints, indexes
--   * NO seed data (Task 26)
--   * NO RLS / policies (future task)
--   * NO auth coupling, NO Storage buckets
--
-- Conventions:
--   * All primary/foreign keys are text (existing stable IDs are preserved).
--   * All timestamps are timestamptz with database defaults.
--   * Canonical lifecycle: draft | published | archived (CHECK-enforced).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance (database-authoritative timestamps)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content hierarchy: courses → weeks → days
-- ---------------------------------------------------------------------------
create table public.courses (
  id          text primary key,
  code        text not null,
  title       text not null,
  short_title text not null,
  description text not null,
  department  text,
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint courses_status_check check (status in ('draft', 'published', 'archived'))
);
create unique index courses_code_key on public.courses (code);

create table public.weeks (
  id          text primary key,
  course_id   text not null,
  title       text not null,
  description text not null,
  week_number integer not null,
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint weeks_status_check check (status in ('draft', 'published', 'archived')),
  -- Composite integrity: lets days FK (course_id, week_id) → (course_id, id)
  constraint weeks_course_id_id_key unique (course_id, id),
  constraint weeks_course_id_week_number_key unique (course_id, week_number),
  constraint weeks_course_id_fkey foreign key (course_id) references public.courses (id) on delete cascade
);
create index weeks_course_id_week_number_idx on public.weeks (course_id, week_number);

create table public.days (
  id               text primary key,
  course_id        text not null,
  week_id          text not null,
  chapter_id       text, -- legacy route/tag metadata (NOT an entity)
  title            text not null,
  description      text not null,
  order_index      integer not null,
  estimated_minutes integer not null default 30,
  objectives       jsonb not null default '[]'::jsonb,           -- string[]
  blocks           jsonb not null default '[]'::jsonb,           -- ContentBlock[]
  status           text not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint days_status_check check (status in ('draft', 'published', 'archived')),
  -- Cross-course day/week references are impossible: (course_id, week_id) must
  -- match a week that belongs to the SAME course.
  constraint days_course_id_week_id_fkey foreign key (course_id, week_id)
    references public.weeks (course_id, id) on delete cascade,
  constraint days_week_id_fkey foreign key (week_id) references public.weeks (id) on delete cascade,
  constraint days_course_id_fkey foreign key (course_id) references public.courses (id) on delete cascade,
  constraint days_week_id_order_index_key unique (week_id, order_index),
  -- Composite integrity for progress tables (same course/week/day triple).
  constraint days_course_id_week_id_id_key unique (course_id, week_id, id)
);
create index days_week_id_order_index_idx on public.days (week_id, order_index);
create index days_course_id_status_idx on public.days (course_id, status);

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------
create table public.questions (
  id             text primary key,
  course_id      text not null,
  chapter_id     text,          -- legacy routing/tag dimension (NOT an entity)
  lesson_id      text,          -- day id reference, advisory
  topic          text not null,
  subtopic       text not null,
  type           text not null,
  difficulty     text not null,
  prompt         text not null,
  options        jsonb,         -- QuestionOption[] (multiple-choice only)
  correct_answer jsonb not null, -- string | number | boolean | option id
  explanation    text not null,
  hint           text,
  marks          integer not null default 1,
  tags           text[] not null default '{}'::text[],
  status         text not null default 'published',
  source         text not null default 'authored',
  variant_of     text,
  author         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint questions_type_check check (type in ('multiple-choice', 'numerical', 'true-false', 'short-answer')),
  constraint questions_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  constraint questions_source_check check (source in ('authored', 'generated', 'imported')),
  constraint questions_status_check check (status in ('draft', 'published', 'archived')),
  constraint questions_course_id_fkey foreign key (course_id) references public.courses (id) on delete cascade,
  constraint questions_variant_of_fkey foreign key (variant_of) references public.questions (id) on delete set null,
  constraint questions_marks_positive_check check (marks > 0)
);
create index questions_course_id_status_idx on public.questions (course_id, status);
create index questions_topic_idx on public.questions (topic);
create index questions_subtopic_idx on public.questions (subtopic);
create index questions_difficulty_idx on public.questions (difficulty);
create index questions_type_idx on public.questions (type);
create index questions_tags_idx on public.questions using gin (tags);

-- ---------------------------------------------------------------------------
-- Assessments (blueprint-driven; no assessment_questions table)
-- ---------------------------------------------------------------------------
create table public.assessments (
  id               text primary key,
  course_id        text not null,
  title            text not null,
  description      text not null,
  duration_minutes integer not null,
  question_count   integer not null,
  blueprint        jsonb not null default '{"rules": []}'::jsonb,
  status           text not null default 'published',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint assessments_status_check check (status in ('draft', 'published', 'archived')),
  constraint assessments_course_id_fkey foreign key (course_id) references public.courses (id) on delete cascade,
  constraint assessments_duration_positive_check check (duration_minutes > 0),
  constraint assessments_question_count_positive_check check (question_count > 0)
);
create index assessments_course_id_status_idx on public.assessments (course_id, status);

-- ---------------------------------------------------------------------------
-- Learning resources + placements
-- ---------------------------------------------------------------------------
create table public.learning_resources (
  id          text primary key,
  type        text not null,
  title       text not null,
  description text,
  tags        text[] not null default '{}'::text[],
  data        jsonb not null, -- YouTubeResourceData | GeoGebraResourceData | ExternalResourceData
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint learning_resources_type_check check (type in ('youtube', 'geogebra', 'external')),
  constraint learning_resources_status_check check (status in ('draft', 'published', 'archived'))
);
create index learning_resources_status_idx on public.learning_resources (status);
create index learning_resources_type_idx on public.learning_resources (type);

create table public.resource_placements (
  id          text primary key,
  resource_id text not null,
  course_id   text, -- exactly ONE of course_id / week_id / day_id (CHECK below)
  week_id     text,
  day_id      text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint resource_placements_single_target_check check (
    ((course_id is not null)::int + (week_id is not null)::int + (day_id is not null)::int) = 1
  ),
  constraint resource_placements_resource_id_fkey foreign key (resource_id)
    references public.learning_resources (id) on delete cascade,
  constraint resource_placements_course_id_fkey foreign key (course_id)
    references public.courses (id) on delete cascade,
  constraint resource_placements_week_id_fkey foreign key (week_id)
    references public.weeks (id) on delete cascade,
  constraint resource_placements_day_id_fkey foreign key (day_id)
    references public.days (id) on delete cascade,
  constraint resource_placements_resource_target_key unique (resource_id, course_id, week_id, day_id)
);
create index resource_placements_day_id_idx on public.resource_placements (day_id);
create index resource_placements_week_id_idx on public.resource_placements (week_id);
create index resource_placements_course_id_idx on public.resource_placements (course_id);
create index resource_placements_resource_id_idx on public.resource_placements (resource_id);

-- ---------------------------------------------------------------------------
-- Course materials (independent subsystem: departments only, NO course FK)
-- ---------------------------------------------------------------------------
create table public.departments (
  id          text primary key,
  name        text not null,
  short_name  text,
  description text,
  order_index integer not null default 0,
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint departments_status_check check (status in ('draft', 'published', 'archived'))
);
create unique index departments_name_key on public.departments (name);
create index departments_order_index_idx on public.departments (order_index);

create table public.course_materials (
  id           text primary key,
  department_id text not null,
  course_code  text,
  course_title text not null,
  description  text,
  url          text not null,
  provider     text,
  order_index  integer not null default 0,
  status       text not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint course_materials_status_check check (status in ('draft', 'published', 'archived')),
  constraint course_materials_url_format_check check (url ~* '^https?://'),
  constraint course_materials_department_id_fkey foreign key (department_id)
    references public.departments (id) on delete restrict,
  constraint course_materials_department_url_key unique (department_id, url)
);
create index course_materials_department_order_idx on public.course_materials (department_id, order_index);
-- App dedupe rule ("same code AND same title within a department") only applies
-- when a course_code exists; partial unique index avoids Postgres NULL-distinct
-- semantics making codeless duplicates collide.
create unique index course_materials_department_code_title_key
  on public.course_materials (department_id, lower(course_code), lower(course_title))
  where course_code is not null;

-- ---------------------------------------------------------------------------
-- Assets (metadata only — no Storage buckets in this task)
-- ---------------------------------------------------------------------------
create table public.assets (
  id         text primary key,
  type       text not null,
  name       text not null,
  title      text,
  alt_text   text,
  source_kind text not null,
  url        text not null,
  size_bytes bigint,
  mime_type  text,
  tags       text[] not null default '{}'::text[],
  status     text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_type_check check (type in ('image', 'video', 'document', 'other')),
  constraint assets_source_kind_check check (source_kind in ('managed', 'external', 'local')),
  constraint assets_status_check check (status in ('draft', 'ready', 'archived'))
);
create index assets_status_idx on public.assets (status);
create index assets_type_idx on public.assets (type);

-- ---------------------------------------------------------------------------
-- Students (Auth intentionally deferred; auth_user_id reserved + unique)
-- ---------------------------------------------------------------------------
create table public.students (
  id           text primary key,
  auth_user_id text, -- future Supabase auth.users id; no FK yet (Auth lands later)
  display_name text not null,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index students_auth_user_id_key on public.students (auth_user_id);

-- ---------------------------------------------------------------------------
-- Student progress facts
-- ---------------------------------------------------------------------------
create table public.student_day_progress (
  student_id         text not null,
  day_id             text not null,
  course_id          text not null,
  week_id            text not null,
  status             text not null default 'not_started',
  started_at         timestamptz,
  completed_at       timestamptz,
  last_visited_at    timestamptz,
  time_spent_seconds integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint student_day_progress_status_check check (status in ('not_started', 'in_progress', 'completed')),
  constraint student_day_progress_pkey primary key (student_id, day_id),
  -- Hierarchy integrity: (course, week, day) triple must exist in days.
  constraint student_day_progress_day_fkey foreign key (course_id, week_id, day_id)
    references public.days (course_id, week_id, id) on delete cascade,
  constraint student_day_progress_student_id_fkey foreign key (student_id)
    references public.students (id) on delete cascade,
  constraint student_day_progress_time_nonnegative_check check (time_spent_seconds >= 0)
);
create index student_day_progress_student_course_idx on public.student_day_progress (student_id, course_id);

create table public.practice_attempts (
  id              text primary key,
  student_id      text not null,
  question_id     text not null,
  course_id       text not null,
  lesson_id       text,
  answer          jsonb not null,
  is_correct      boolean not null,
  marks_earned    integer not null default 0,
  marks_available integer not null default 1,
  started_at      timestamptz,
  answered_at     timestamptz,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint practice_attempts_student_id_fkey foreign key (student_id)
    references public.students (id) on delete cascade,
  constraint practice_attempts_question_id_fkey foreign key (question_id)
    references public.questions (id) on delete cascade,
  constraint practice_attempts_course_id_fkey foreign key (course_id)
    references public.courses (id) on delete cascade,
  constraint practice_attempts_marks_check check (marks_earned >= 0 and marks_available >= 0)
);
create index practice_attempts_student_course_created_idx on public.practice_attempts (student_id, course_id, created_at);
create index practice_attempts_question_id_idx on public.practice_attempts (question_id);

create table public.assessment_attempts (
  id              text primary key,
  student_id      text not null,
  assessment_id   text not null,
  course_id       text not null,
  chapter_id      text,
  answers         jsonb not null default '{}'::jsonb, -- questionId → value
  score           numeric not null default 0,
  percentage      integer not null default 0,
  marks_earned    integer not null default 0,
  marks_available integer not null default 0,
  status          text not null default 'in_progress',
  started_at      timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint assessment_attempts_status_check check (status in ('in_progress', 'submitted')),
  constraint assessment_attempts_student_id_fkey foreign key (student_id)
    references public.students (id) on delete cascade,
  constraint assessment_attempts_assessment_id_fkey foreign key (assessment_id)
    references public.assessments (id) on delete cascade,
  constraint assessment_attempts_course_id_fkey foreign key (course_id)
    references public.courses (id) on delete cascade,
  constraint assessment_attempts_percentage_range_check check (percentage >= 0 and percentage <= 100)
);
create index assessment_attempts_student_assessment_idx on public.assessment_attempts (student_id, assessment_id);
-- Part 12 concurrency rule: at most ONE in-progress attempt per student+assessment.
create unique index assessment_attempts_single_in_progress_key
  on public.assessment_attempts (student_id, assessment_id)
  where status = 'in_progress';

create table public.activity_events (
  id          text primary key,
  student_id  text not null,
  course_id   text not null,
  type        text not null,
  occurred_at timestamptz not null default now(),
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint activity_events_type_check check (type in (
    'lesson_started', 'lesson_completed', 'practice_started',
    'question_answered', 'assessment_started', 'assessment_submitted', 'course_started'
  )),
  constraint activity_events_student_id_fkey foreign key (student_id)
    references public.students (id) on delete cascade,
  constraint activity_events_course_id_fkey foreign key (course_id)
    references public.courses (id) on delete cascade
);
create index activity_events_student_occurred_idx on public.activity_events (student_id, occurred_at);
create index activity_events_course_occurred_idx on public.activity_events (course_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Admin allowlist (authorization itself is NOT implemented in this task)
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id    text primary key, -- future Supabase auth user id; no FK until Auth
  role       text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('admin'))
);

-- ---------------------------------------------------------------------------
-- updated_at triggers (all tables) — backend-authoritative timestamps
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.weeks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.days for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.questions for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assessments for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.learning_resources for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.resource_placements for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.departments for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.course_materials for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.student_day_progress for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.practice_attempts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assessment_attempts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.activity_events for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.admin_users for each row execute function public.set_updated_at();

-- End of Task 25 migration. No seed data, no RLS, no auth, no storage.
