# Google OAuth trigger PostgreSQL integration test

This suite creates a fresh PostgreSQL cluster and database under the current
user's temporary directory. It never reads application environment files,
connects to a configured Supabase project, or touches a running PostgreSQL
service. The cluster binds only to `127.0.0.1`, uses synthetic `.invalid`
emails and IDs, then is stopped and removed by the runner.

The SQL fixture creates only the `auth.users` and `public.students` structures
required by `handle_new_auth_user()`, installs the actual migration, and
attaches the same `AFTER INSERT` trigger. It does not run the full application
migration history or create student-owned tables because these trigger cases do
not need them.

## Requirements and command (Windows)

Install PostgreSQL 15+ server tools (`initdb.exe`, `pg_ctl.exe`, and
`psql.exe`). Then from the app directory run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/postgres/run-google-oauth-trigger.ps1
```

If PostgreSQL binaries are not on `PATH` or in the PostgreSQL 18 default
directory, pass their directory explicitly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/postgres/run-google-oauth-trigger.ps1 -PostgresBin "C:\Program Files\PostgreSQL\18\bin"
```

The runner initializes a new cluster in a GUID-named subdirectory of `%TEMP%`,
selects a free loopback port, creates `google_oauth_trigger_test`, executes the
SQL fixture, runs two coordinated concurrent `psql` clients, asserts final
Auth/student counts, then stops and removes only that generated cluster
directory. It never targets an existing local service.

## Covered cases and test type

These are real PostgreSQL trigger integration tests, not the Node tests that
inspect SQL text. They verify:

- a new Auth row creates exactly one mapped student;
- re-firing the trigger for the same Auth UUID preserves the original student
  ID (the synthetic Auth row is deleted and reinserted to fire the real
  `AFTER INSERT` trigger again);
- a different Auth UUID with a normalized matching email is rejected and
  leaves both Auth and student counts unchanged;
- a NULL-mapped legacy profile does not block signup and remains unchanged;
- an injected student insert failure rolls back the synthetic Auth insert;
- two overlapping inserts for the same normalized email serialize, and the
  second attempt is rejected.

The concurrency case holds the exact transaction advisory-lock key with a
session lock while the first trigger inserts, starts the competing client
before the first transaction commits, and verifies through `pg_stat_activity`
that the competing query is waiting on that advisory lock. The first
transaction then commits and the second signup must be rejected. This tests
the trigger behavior against a real PostgreSQL server. It does not test
Supabase GoTrue identity-linking semantics or provider configuration.
