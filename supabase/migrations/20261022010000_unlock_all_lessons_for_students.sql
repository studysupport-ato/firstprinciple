-- When the global "unlock all lessons" setting is on, every signed-in student may open
-- any published lesson, not only admins in testing mode. The lesson list already shows
-- every lesson as open, so the server must agree or students hit a 404.
-- Students cannot read platform_settings (admin-only RLS), so expose just this one flag.
create or replace function public.lessons_unlocked_for_all()
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $f$
  select coalesce((select s.unlock_all_lessons_enabled from public.platform_settings as s where s.id = 'global'), false);
$f$;
revoke all on function public.lessons_unlocked_for_all() from public;
grant execute on function public.lessons_unlocked_for_all() to authenticated;

create or replace function public.get_published_day_step(p_course_id text, p_week_reference text, p_day_id text, p_step integer default null::integer)
 returns table(id text, course_id text, week_id text, chapter_id text, title text, description text, order_index integer, estimated_minutes integer, objectives jsonb, status text, testing_mode boolean, step_metadata jsonb, content_blocks jsonb)
 language sql
 stable
 set search_path to ''
as $function$
  with settings as (
    select public.lessons_unlocked_for_all() as unlock_all
  ),
  viewer as (
    select
      (
        select s.id
        from public.students as s
        where s.auth_user_id = auth.uid()::text
      ) as student_id,
      (
        exists (
          select 1
          from public.admin_users as au
          where au.user_id = auth.uid()::text
            and au.role = 'admin'
        )
        and (select unlock_all from settings)
      ) as testing_mode,
      (select unlock_all from settings) as unlock_all
    where auth.uid() is not null
  ),
  scoped_week as (
    select w.id
    from public.weeks as w
    join public.courses as c on c.id = w.course_id
    where w.course_id = p_course_id
      and (w.id = p_week_reference or w.week_number::text = p_week_reference)
      and c.status = 'published'
      and w.status = 'published'
    order by (w.id = p_week_reference) desc
    limit 1
  ),
  week_days as (
    select
      d.id,
      row_number() over (order by d.order_index, d.id) as lesson_index
    from public.days as d
    join scoped_week as w on w.id = d.week_id
    where d.course_id = p_course_id
      and d.status = 'published'
  ),
  student_progress as (
    select p.day_id, p.status
    from public.student_day_progress as p
    join viewer as v on v.student_id = p.student_id
    join scoped_week as w on w.id = p.week_id
    where p.course_id = p_course_id
  ),
  first_incomplete as (
    select min(d.lesson_index) as lesson_index
    from week_days as d
    left join student_progress as p on p.day_id = d.id
    where p.status is distinct from 'completed'
  ),
  target_access as (
    select
      v.testing_mode,
      (
        v.testing_mode
        or (
        v.student_id is not null
        and (
          v.unlock_all
          or target_progress.status = 'completed'
          or first_incomplete.lesson_index is null
          or target.lesson_index <= first_incomplete.lesson_index + 1
        )
        )
      ) as allowed
    from viewer as v
    join week_days as target on target.id = p_day_id
    left join student_progress as target_progress on target_progress.day_id = target.id
    cross join first_incomplete
  ),
  scoped_day as (
    select
      d.id,
      d.course_id,
      d.week_id,
      d.chapter_id,
      d.title,
      d.description,
      d.order_index,
      d.estimated_minutes,
      d.objectives,
      d.status,
      d.content_blocks,
      access.testing_mode
    from public.days as d
    join scoped_week as w on w.id = d.week_id
    join target_access as access on access.allowed
    where d.course_id = p_course_id
      and d.id = p_day_id
      and d.status = 'published'
  ),
  expanded_blocks as (
    select
      b.value as block,
      b.ordinality,
      case
        when jsonb_typeof(b.value -> 'step') = 'number'
          and (b.value ->> 'step')::numeric = trunc((b.value ->> 'step')::numeric)
          and (b.value ->> 'step')::numeric between -2147483648 and 2147483647
          then (b.value ->> 'step')::integer
        else 1
      end as step_number
    from scoped_day as d
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(d.content_blocks) = 'array' then d.content_blocks
        else '[]'::jsonb
      end
    ) with ordinality as b(value, ordinality)
  ),
  steps as (
    select
      b.step_number,
      (array_agg(b.block ->> 'text' order by b.ordinality)
        filter (where b.block ->> 'type' = 'heading'))[1] as heading
    from expanded_blocks as b
    group by b.step_number
  ),
  ranked_steps as (
    select
      s.step_number,
      s.heading,
      row_number() over (order by s.step_number) as step_index
    from steps as s
  ),
  step_metadata as (
    select case
      when p_step is null then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'step', s.step_number,
              'title', coalesce(nullif(s.heading, ''), 'Step ' || s.step_index::text)
            )
            order by s.step_number
          )
          from ranked_steps as s
        ),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end as value
  ),
  selected_step as (
    select case when p_step is null then min(b.step_number) else p_step end as step_number
    from expanded_blocks as b
    having p_step is null or bool_or(b.step_number = p_step)
  ),
  selected_blocks as (
    select coalesce(jsonb_agg(b.block order by b.ordinality), '[]'::jsonb) as value
    from expanded_blocks as b
    join selected_step as s on s.step_number = b.step_number
  )
  select
    d.id,
    d.course_id,
    d.week_id,
    d.chapter_id,
    d.title,
    d.description,
    d.order_index,
    d.estimated_minutes,
    d.objectives,
    d.status,
    d.testing_mode,
    (select m.value from step_metadata as m),
    (select b.value from selected_blocks as b)
  from scoped_day as d
  where (p_step is null and not exists (select 1 from expanded_blocks))
     or exists (select 1 from selected_step);
$function$;

-- Lessons are open to everyone for now (switch off later from the admin lesson-unlock toggle).
update public.platform_settings set unlock_all_lessons_enabled = true, updated_at = now() where id = 'global';
