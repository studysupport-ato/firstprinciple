\set ON_ERROR_STOP on

BEGIN;

SELECT pg_advisory_lock(hashtextextended('concurrent@oauth-test.invalid', 0));

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '50000000-0000-0000-0000-000000000005',
  'concurrent@oauth-test.invalid',
  '{"full_name":"Synthetic Concurrent Winner"}'
);

SELECT pg_sleep(3);
COMMIT;

SELECT pg_advisory_unlock(hashtextextended('concurrent@oauth-test.invalid', 0));
