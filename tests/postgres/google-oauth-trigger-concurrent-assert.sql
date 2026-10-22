\set ON_ERROR_STOP on

DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 3
     OR (SELECT count(*) FROM public.students) <> 4
     OR (
       SELECT count(*)
       FROM public.students
       WHERE lower(btrim(email)) = 'concurrent@oauth-test.invalid'
         AND auth_user_id IS NOT NULL
     ) <> 1
     OR EXISTS (
       SELECT 1 FROM auth.users
       WHERE id = '60000000-0000-0000-0000-000000000006'
     ) THEN
    RAISE EXCEPTION 'Concurrent signup test produced inconsistent Auth/student counts.';
  END IF;
END;
$$;

SELECT 'PASS: concurrent same-email signup produced exactly one Auth user and profile' AS result;
