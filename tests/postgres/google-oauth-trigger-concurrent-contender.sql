\set ON_ERROR_STOP on
\set VERBOSITY verbose

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '60000000-0000-0000-0000-000000000006',
  ' CONCURRENT@OAUTH-TEST.INVALID ',
  '{"full_name":"Synthetic Concurrent Contender"}'
);
