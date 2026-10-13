-- Topics inside a course (e.g. Basic Mechanics: Statics, Friction), so materials of every type
-- can be grouped for easier finding.
--
-- A course row keeps its topics, in order, in topics: [{"id": "...", "name": "..."}].
-- A material row points at one of them with topic_id. A null or unknown topic_id (for example
-- after the topic was removed) simply means "not in a topic"; nothing is deleted.

alter table public.course_materials
  add column if not exists topics jsonb not null default '[]'::jsonb,
  add column if not exists topic_id text;

comment on column public.course_materials.topics is 'For a course row: its topics in order, [{id, name}].';
comment on column public.course_materials.topic_id is 'For a material: the id of the topic (from its course''s topics) it is grouped under. Null or unknown = not in a topic.';
