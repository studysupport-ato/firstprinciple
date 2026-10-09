# Back2Basics with Kwamina

Back2Basics with Kwamina is an interactive university learning platform focused on rebuilding mathematical understanding from first principles. Students can browse published courses, follow a course roadmap, study lessons, practise questions, complete assessments, and track learning progress. The platform also includes course materials, account settings, and an administration workspace for managing learning content.

This repository is the Next.js application and is configured to display this README on its GitHub repository page.

## Contents

- [Highlights](#highlights)
- [Technology](#technology)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [Supabase setup](#supabase-setup)
- [Student signup and onboarding](#student-signup-and-onboarding)
- [Main routes](#main-routes)
- [Development commands](#development-commands)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Contributing](#contributing)

## Highlights

- **Course library:** Browse published courses and see their week/day structure and student progress.
- **Guided learning:** Navigate course roadmaps, lessons, learning resources, practice, and assessments.
- **Course materials:** Browse academic resources by department, filter the collection, and use bookmarks.
- **Progress tracking:** Track lesson progress, practice attempts, assessment activity, and learning streaks.
- **Student accounts:** Authenticate with Supabase; student records and progress are associated with the authenticated student.
- **First-signup experience:** New signups provide their name, agree to the Terms and Conditions, complete the first-time guided tour, and then provide a phone number in a separate one-time prompt.
- **Editable settings:** Students can review and edit their profile information and preferences.
- **Administration:** Protected admin routes support management of courses, lessons, questions, assessments, resources, media, and student profiles.
- **Responsive interface:** The app uses responsive layouts and motion effects, with reduced-motion support in the onboarding tour.

## Technology

| Area | Technology |
| --- | --- |
| Web framework | Next.js 16 (App Router) |
| UI | React 19 and TypeScript |
| Styling | Tailwind CSS 4 |
| Authentication, database, and storage | Supabase |
| Server-side Supabase cookies | `@supabase/ssr` |
| Animation | Framer Motion and GSAP |
| Icons | Lucide React |
| Mathematical notation | KaTeX |
| 3D visuals | Three.js with React Three Fiber and Drei |

## Project structure

```text
.
├── app/                 # App Router pages and route layouts
├── components/          # UI, learning, authentication, and platform components
├── lib/                 # Supabase, student, content, and progress logic
├── public/              # Static assets
├── scripts/             # Smoke checks and verification scripts
├── supabase/
│   └── migrations/      # Ordered SQL schema and policy migrations
├── .env.example         # Environment-variable template
└── package.json
```

## Requirements

- Node.js compatible with Next.js 16 (Node.js 20.9 or later is recommended).
- npm.
- A Supabase project for authentication and live database-backed features.

## Run locally

From the repository root:

```powershell
npm install
Copy-Item .env.example .env.local
```

Add the values for your own Supabase project and admin account to `.env.local` as described in [Environment configuration](#environment-configuration), then start the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production-mode local check:

```powershell
npm run build
npm run start
```

The development server uses the default Next.js port `3000`. If that port is already occupied, Next.js may select another available port and print it in the terminal.

## Environment configuration

The template is [`.env.example`](./.env.example). Put actual values in `.env.local`; do not commit that file.

### Public Supabase settings

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-OR-ANON-KEY
```

The publishable key is intended for browser use and is subject to Supabase Row Level Security (RLS). Existing projects using the legacy anonymous key may use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead.

### Server-only Supabase and admin settings

```dotenv
SUPABASE_SECRET_KEY=YOUR-SECRET-SERVICE-ROLE-KEY
ADMIN_EMAIL=YOUR-ADMIN-EMAIL
ADMIN_PASSWORD=YOUR-ADMIN-PASSWORD
ADMIN_SESSION_SECRET=YOUR-ADMIN-SESSION-SIGNING-SECRET
```

These values must remain server-side. In particular, never prefix the Supabase secret/service-role key or admin values with `NEXT_PUBLIC_`, commit real credentials, or expose them in client code. Generate a strong random value for `ADMIN_SESSION_SECRET`; for example, `openssl rand -hex 64` where OpenSSL is available.

The app also recognizes `SUPABASE_SERVICE_ROLE_KEY` as a server-only compatibility name for `SUPABASE_SECRET_KEY`.

## Supabase setup

1. Create a Supabase project and copy its project URL and publishable key into `.env.local`.
2. Configure Supabase Auth for the account-creation experience used by this app. The app expects email/password signup to establish a session immediately; configure email confirmation accordingly in Supabase Auth.
3. Apply the SQL migrations in [`supabase/migrations`](./supabase/migrations) to the project, in filename order. You can run them using the Supabase SQL Editor or your team's established migration workflow.
4. Confirm the latest student phone-number migration, [`20261008000000_add_student_phone_number.sql`](./supabase/migrations/20261008000000_add_student_phone_number.sql), has been applied. It adds `phone_number` to `public.students`.
5. If using the admin workspace, configure the server-only admin credentials and session signing secret listed above.

The migration history establishes the application schema and gradually configures content publication, student-owned records, RLS policies, storage, admin access, progress relationships, and profile phone storage. Review the SQL before applying it to a production database.

### Student identity and data access

For a signed-in student, the canonical identity relationship is:

```text
Supabase Auth user
    → students.auth_user_id
    → students.id
    → student-owned profile and learning records
```

Authenticated student reads and writes use the browser or server Supabase client with the user's session and RLS. The Auth user UUID is not used as `students.id`. The service-role secret is reserved for explicitly server-only administrative operations; it must not be used to bypass RLS from the browser.

## Student signup and onboarding

The student signup flow keeps account creation and the post-signup prompt separate:

1. The signup form collects the student's full name, email, and password, and requires agreement to the Terms and Conditions.
2. After successful signup, the student's name is saved to the canonical student profile.
3. A first-time student is directed to `/courses?onboarding=true`. The guided tour is available only to an authenticated user with the pending first-signup marker and explains Courses, Course Materials, Questions, and Settings.
4. After the tour is finished or skipped, a separate profile popup asks for the student's phone number.
5. A Ghanaian phone number in local (`0XXXXXXXXX`) or international (`+233XXXXXXXXX`) format is accepted and normalized to local format before saving to `students.phone_number`.
6. The phone popup cannot be dismissed before a valid number is saved. Once the number is persisted, it does not appear again for that account.

The one-time onboarding trigger markers are stored in browser local storage, while the phone number and canonical name are stored in the Supabase student record. A student's saved phone number is therefore available across signed-in devices; browser-local onboarding markers are specific to the browser where signup occurred.

The guided tour can be previewed during development by visiting `/courses?onboarding=true` while authenticated and with a pending first-signup marker. The tour intentionally does not run for signed-out visitors or on the dashboard.

## Main routes

### Student and public routes

| Route | Purpose |
| --- | --- |
| `/` | Public/marketing landing page |
| `/courses` | Published course library |
| `/courses/[courseId]/roadmap` | Course roadmap |
| `/courses/[courseId]/chapter/[chapterId]/lesson/[id]` | Lesson experience |
| `/courses/[courseId]/chapter/[chapterId]/practice` | Practice experience |
| `/courses/[courseId]/chapter/[chapterId]/assessment/[assessmentId]` | Assessment experience |
| `/course-materials` | Course materials directory |
| `/course-materials/[departmentId]` | Department materials |
| `/dashboard` | Student learning dashboard |
| `/progress` | Student progress |
| `/questions` | Question/practice area |
| `/settings` | Student profile and preferences |
| `/reset-password` | Password recovery and reset |
| `/terms` | Terms and Conditions |

Some student data and activities require authentication. The course library and other public content can be browsed without signing in.

### Administration routes

The `/admin` route group contains the admin home, login, settings, student directory and profiles, and content-management pages for courses, weeks, lessons, questions, assessments, resources, course materials, and media. Admin credentials and session signing configuration are server-side environment values; admin pages/actions should remain protected by the application's authorization checks and database policies.

## Development commands

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run typecheck` | Run TypeScript checking without emitting files |
| `npm run build` | Build the production app |
| `npm run start` | Start the production build |
| `npm run test:mobile` | Run the mobile and desktop Playwright experience checks |
| `npm run seed:math151` | Seed the Math 151 course data |
| `npm run seed:math151:check` | Check the Math 151 seed data without applying it |

## Testing and verification

The project provides targeted smoke and verification scripts. Run them from the repository root:

```powershell
npm run typecheck
npm run test:mobile
npm run smoke:course-structure
npm run smoke:questions-assessments
npm run smoke:resources-course-materials-assets
npm run smoke:progress
npm run smoke:published-day
npm run smoke:published-structure
npm run smoke:course-content
npm run verify:profile-edit
npm run verify:day-persistence
npm run verify:day-transfer
npm run verify:question-read-boundary
npm run verify:resource-read-boundary
npm run verify:asset-read-boundary
npm run verify:admin-session-boundary
```

The smoke scripts cover published curriculum, questions and assessments, resources, progress, and course content. Verification scripts check profile editing, persistence, transfer behavior, and selected data-access boundaries. Some checks may require valid local Supabase configuration or database state. Run the relevant focused checks after changing the corresponding feature; `npm run build` is also recommended before deployment.

The mobile Playwright suite uses an iPhone 13 Chromium context with touch emulation and checks the 375 × 667, 390 × 844, and 412 × 915 phone viewports, plus desktop regressions. It covers the course library, navigation, course materials, roadmap, lesson, questions, practice, assessment, signup, and the signed-out settings boundary. On a fresh checkout, run `npx playwright install chromium` once to install the browser. The Playwright config starts the development server when one is not already available at `http://localhost:3000`; set `PLAYWRIGHT_BASE_URL` to use another local URL.

## Deployment

Deploy the Next.js application using a platform that supports Next.js (for example, Vercel) or another compatible Node.js hosting provider.

For a deployment:

1. Set the app's root/build directory to this repository root.
2. Configure all required environment variables in the hosting provider's server-side environment settings.
3. Apply pending Supabase migrations to the intended database.
4. Verify that Supabase Auth redirect URLs and allowed origins include the deployed domain.
5. Run the production build and check student signup, sign-in, password reset, course browsing, and admin access.
6. Confirm that secrets are available only to server runtime code and are not included in client bundles.

Production deployments should use a separate Supabase project (or otherwise deliberately isolated data) from development. Do not deploy with placeholder environment values.

## Security notes

- Never commit `.env.local`, Supabase secret/service-role keys, admin passwords, session-signing secrets, access tokens, or real student personal information.
- Keep RLS enabled and review policies when adding tables, columns, or access paths.
- Use the publishable key for browser operations. Keep privileged credentials in server-only modules.
- Validate and authorize admin operations on the server; hiding an admin link in the UI is not authorization.
- Treat student names, email addresses, phone numbers, and learning progress as personal data. Collect and expose only what the application needs.
- Report suspected credential leaks or security issues through a private channel rather than publishing exploitable details.

## Contributing

1. Create a focused branch for your change.
2. Keep changes within the existing Next.js app and its established repository/data-access patterns.
3. Update related documentation when behavior, configuration, or database setup changes.
4. Run `npm run typecheck` and the most relevant smoke or verification scripts.
5. Review the final diff for accidental secrets, local environment files, generated output, and unrelated edits before opening a pull request.

## License

No license is specified in this repository at this time. Unless a license is added, copying, modifying, or redistributing this code is not automatically permitted.
