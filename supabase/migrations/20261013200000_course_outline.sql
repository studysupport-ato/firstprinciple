-- A course's outline (chapters → sections → subtopics → cases), shown to students as the
-- tap-to-open "course structure" on the course's materials page. Empty = no structure shown.
--
-- Shape: [{"n": 1, "t": "Chapter title", "secs": [{"num": "1.1", "t": "Section", "cases": ["Case 1: …"],
--          "subs": [{"num": "1.1.1", "t": "Subtopic", "cases": []}]}]}]

alter table public.course_materials
  add column if not exists outline jsonb not null default '[]'::jsonb;

comment on column public.course_materials.outline is 'For a course row: its outline [{n, t, secs: [{num, t, cases, subs: [{num, t, cases}]}]}], shown as the course structure.';
