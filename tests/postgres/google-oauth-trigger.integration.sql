\set ON_ERROR_STOP on

CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.students (
  id text PRIMARY KEY,
  auth_user_id text,
  display_name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX students_auth_user_id_key
  ON public.students (auth_user_id);

INSERT INTO public.students (id, auth_user_id, display_name, email)
VALUES (
  'legacy-profile',
  NULL,
  'Synthetic Legacy Student',
  'legacy@oauth-test.invalid'
);

\ir ../../supabase/migrations/20261022140000_prevent_duplicate_student_email_profiles.sql

CREATE TRIGGER on_auth_user_created_student
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 0
     OR (SELECT count(*) FROM public.students) <> 1 THEN
    RAISE EXCEPTION 'Unexpected initial test database state.';
  END IF;
END;
$$;

DO $$
DECLARE
  v_student_id text;
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    '10000000-0000-0000-0000-000000000001',
    'new@oauth-test.invalid',
    '{"full_name":"Synthetic New Student"}'
  );

  SELECT id INTO STRICT v_student_id
  FROM public.students
  WHERE auth_user_id = '10000000-0000-0000-0000-000000000001';

  IF (SELECT count(*) FROM auth.users) <> 1
     OR (SELECT count(*) FROM public.students) <> 2
     OR (SELECT count(*) FROM public.students WHERE auth_user_id = '10000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'New Auth user did not create exactly one student profile.';
  END IF;

  DELETE FROM auth.users
  WHERE id = '10000000-0000-0000-0000-000000000001';

  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    '10000000-0000-0000-0000-000000000001',
    'new@oauth-test.invalid',
    '{"full_name":"Synthetic New Student"}'
  );

  IF (SELECT count(*) FROM auth.users) <> 1
     OR (SELECT count(*) FROM public.students) <> 2
     OR (SELECT count(*) FROM public.students WHERE auth_user_id = '10000000-0000-0000-0000-000000000001') <> 1
     OR (SELECT id FROM public.students WHERE auth_user_id = '10000000-0000-0000-0000-000000000001') <> v_student_id THEN
    RAISE EXCEPTION 'Same-identity trigger retry did not preserve the original student profile.';
  END IF;
END;
$$;

DO $$
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    '20000000-0000-0000-0000-000000000002',
    ' LEGACY@OAUTH-TEST.INVALID ',
    '{"full_name":"Synthetic Student With Legacy Email"}'
  );

  IF (SELECT count(*) FROM auth.users) <> 2
     OR (SELECT count(*) FROM public.students) <> 3
     OR (SELECT count(*) FROM public.students WHERE auth_user_id = '20000000-0000-0000-0000-000000000002') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.students
       WHERE id = 'legacy-profile'
         AND auth_user_id IS NULL
         AND display_name = 'Synthetic Legacy Student'
         AND email = 'legacy@oauth-test.invalid'
     ) THEN
    RAISE EXCEPTION 'Legacy profile blocked signup or was modified.';
  END IF;
END;
$$;

DO $$
DECLARE
  v_auth_count bigint;
  v_student_count bigint;
  v_rejected boolean := false;
BEGIN
  SELECT count(*) INTO v_auth_count FROM auth.users;
  SELECT count(*) INTO v_student_count FROM public.students;

  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (
      '30000000-0000-0000-0000-000000000003',
      ' NEW@OAUTH-TEST.INVALID ',
      '{"full_name":"Synthetic Conflicting Student"}'
    );

    RAISE EXCEPTION 'Expected a mapped-email conflict, but the Auth insert succeeded.';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      v_rejected := true;
  END;

  IF NOT v_rejected
     OR (SELECT count(*) FROM auth.users) <> v_auth_count
     OR (SELECT count(*) FROM public.students) <> v_student_count
     OR EXISTS (
       SELECT 1 FROM auth.users
       WHERE id = '30000000-0000-0000-0000-000000000003'
     ) THEN
    RAISE EXCEPTION 'Rejected mapped-email signup left Auth or student rows behind.';
  END IF;
END;
$$;

CREATE FUNCTION public.fail_student_insert_for_test()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23505',
    MESSAGE = 'Synthetic student insert failure.';
END;
$$;

CREATE TRIGGER fail_student_insert_for_test
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.fail_student_insert_for_test();

DO $$
DECLARE
  v_auth_count bigint;
  v_student_count bigint;
BEGIN
  SELECT count(*) INTO v_auth_count FROM auth.users;
  SELECT count(*) INTO v_student_count FROM public.students;

  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (
      '40000000-0000-0000-0000-000000000004',
      'insert-failure@oauth-test.invalid',
      '{"full_name":"Synthetic Insert Failure"}'
    );

    RAISE EXCEPTION 'Expected a student insert failure, but the Auth insert succeeded.';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  IF (SELECT count(*) FROM auth.users) <> v_auth_count
     OR (SELECT count(*) FROM public.students) <> v_student_count
     OR EXISTS (
       SELECT 1 FROM auth.users
       WHERE id = '40000000-0000-0000-0000-000000000004'
     ) THEN
    RAISE EXCEPTION 'Student insert failure did not roll back Auth-user creation.';
  END IF;
END;
$$;

DROP TRIGGER fail_student_insert_for_test ON public.students;
DROP FUNCTION public.fail_student_insert_for_test();

DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 2
     OR (SELECT count(*) FROM public.students) <> 3 THEN
    RAISE EXCEPTION 'Unexpected counts after sequential integration tests.';
  END IF;
END;
$$;

SELECT 'PASS: sequential trigger integration cases' AS result;
