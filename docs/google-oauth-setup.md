# Google OAuth setup

The app uses Supabase Auth and its existing SSR cookie session. The app callback
is `/auth/callback`; do not send Google directly to that route. Google returns
to the Supabase provider callback, after which Supabase redirects to the app.

## Supabase dashboard

Apply `20261022140000_prevent_duplicate_student_email_profiles.sql` before
enabling Google for students. It updates the trigger function and leaves
existing student rows and IDs untouched.

1. In **Authentication → Providers → Google**, enable Google and enter the
   Google web OAuth client ID and client secret. Keep the secret in Supabase;
   it is not an application environment variable.
2. In **Authentication → URL Configuration**, set the production Site URL to
   `https://www.b2bwithkwamina.com` and allow the exact app callback
   `https://www.b2bwithkwamina.com/auth/callback`.
3. Add the matching local callback URL for development, such as
   `http://localhost:3000/auth/callback`, to the redirect allowlist.
4. Enable **manual identity linking** in the Auth provider/security settings.
   Students must sign in to their existing account before using **Link Google**
   in Settings.
5. Verify the project's email-confirmation and verified-email identity-linking
   behavior. This app does not assume email confirmation is enabled. A new
   Auth identity whose email already belongs to a student profile is rejected
   by the student-creation trigger guard unless Supabase has linked it to the
   existing Auth user. The student must then sign in to the existing account
   and link Google explicitly.

## Google Cloud

Create a **Web application** OAuth client in Google Cloud:

- Authorized JavaScript origin: `https://www.b2bwithkwamina.com`
- Add the development origin `http://localhost:3000` only for local testing.
- Authorized redirect URI: the Supabase project's callback URL shown in the
  Google provider settings (normally
  `https://<project-ref>.supabase.co/auth/v1/callback`).

The Google authorized redirect URI is the Supabase callback, not
`/auth/callback`. Supabase sends the user to the app callback after completing
the provider flow.

## Identity and data safety

The migration `20261022140000_prevent_duplicate_student_email_profiles.sql`
preserves the existing `auth.users.id → students.auth_user_id → students.id`
mapping and refuses to create a second student profile when another profile
already uses the same email. It does not merge accounts, change student IDs,
or rewrite student-owned foreign keys. Existing students should link Google
only after signing in to their current account.

Test with a new Google email and with an existing email/password account before
enabling the provider for production users. Verify that the linked session has
the original Auth user ID and resolves to the original `students.id`.
