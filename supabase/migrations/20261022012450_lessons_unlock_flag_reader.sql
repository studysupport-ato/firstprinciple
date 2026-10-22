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

do $$
declare src text;
begin
  select pg_get_functiondef('public.get_published_day_step(text,text,text,integer)'::regprocedure) into src;
  src := replace(src, $r$coalesce(
      (select s.unlock_all_lessons_enabled from public.platform_settings as s where s.id = 'global'),
      false
    ) as unlock_all$r$, 'public.lessons_unlocked_for_all() as unlock_all');
  if position('lessons_unlocked_for_all' in src) = 0 then raise exception 'replace failed'; end if;
  execute src;
end $$;
