-- Coming-soon weeks: only admins can open their lessons (used for previewing unreleased content).
do $$
declare src text; old text;
begin
  select pg_get_functiondef('public.get_published_day_step(text,text,text,integer)'::regprocedure) into src;
  old := $o$      and c.status = 'published'
      and w.status = 'published'$o$;
  if position(old in src) = 0 then raise exception 'pattern not found'; end if;
  src := replace(src, old, $n$      and c.status = 'published'
      and w.status = 'published'
      and (
        not coalesce(w.coming_soon, false)
        or exists (
          select 1 from public.admin_users as au
          where au.user_id = auth.uid()::text and au.role = 'admin'
        )
      )$n$);
  execute src;
end $$;
