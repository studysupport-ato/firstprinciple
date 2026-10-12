# Back2Basics with Kwamina

Back2Basics with Kwamina is an interactive university learning platform focused on rebuilding mathematical understanding from first principles. Students can browse published courses, follow a course roadmap, study lessons, practise questions, complete assessments, and track learning progress. The platform also includes course materials, account settings, and an administration workspace for managing learning content.

This repository is the Next.js application and is configured to display this README on its GitHub repository page.

## Contents

- [Highlights](#highlights)
- [Technology](#technology)
- [Project structure](#project-structure)
- [Application architecture](#application-architecture)
- [Lesson content and authoring](#lesson-content-and-authoring)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [Supabase setup](#supabase-setup)
- [Student signup and onboarding](#student-signup-and-onboarding)
- [Main routes](#main-routes)
- [Development commands](#development-commands)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Git branches and deployment workflow](#git-branches-and-deployment-workflow)
- [Security notes](#security-notes)
- [Contributing](#contributing)

## Highlights

- **Course library:** Browse published courses and see their week/day structure and student progress.
- **Guided learning:** Navigate course roadmaps, lessons, learning resources, practice, and assessments.
- **Structured lesson steps:** Lessons are authored as ordered content blocks grouped into steps. Desktop lessons can place notes, examples, questions, and other blocks in a side pane while the main pane presents the current step. Mobile layouts keep the same content usable in a single-column flow.
- **Interactive lesson checks:** Mid-lesson and end-of-lesson multiple-choice quizzes support answer checking, feedback and explanations. A lesson can require its end check to be completed before the student continues.
- **Visual learning:** Lessons support rendered mathematics, worked examples, callouts, images, videos, GeoGebra activities, custom visualizers and interactive boards. Board experiences include mobile-friendly layouts and full-screen controls.
- **Content authoring:** The protected admin lesson editor can create and reorder supported block types, edit lesson content, preview changes, and upload lesson images.
- **Course materials:** Browse academic resources by department, filter the collection, and use bookmarks.
- **Progress tracking:** Track lesson progress, practice attempts, assessment activity, and learning streaks.
- **Web analytics:** Vercel Web Analytics is included in the root layout to collect page views and navigation activity after deployment on Vercel.
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
├── components/          # UI, learning blocks, authentication, and platform components
├── lib/                 # Supabase clients, repositories, content, auth, and progress logic
├── public/              # Static assets
├── scripts/             # Seed, smoke-check, and boundary-verification scripts
├── supabase/
│   └── migrations/      # Ordered schema, RLS, storage, and data migrations
├── .env.example         # Environment-variable template
└── package.json
```

### Application architecture

- **Routing and rendering:** The Next.js App Router serves the public landing page, the student learning platform, and the protected admin workspace. Server-rendered route data is composed with React client components for interactive lesson steps, navigation, practice, and account experiences.
- **Content model:** Course structure follows Course → Week → Day (the UI presents a Day as a lesson). Lesson bodies are ordered, typed content blocks. Blocks can be assigned to a step and, for split lessons, to the `main` or `side` pane.
- **Data access:** Supabase access is kept in server/client helpers and domain repositories under `lib/`. Server-rendered requests use request-scoped clients with the current cookie session. Student-owned operations are expected to use the authenticated user context and database Row Level Security (RLS).
- **Interactive content:** Custom visualizer HTML is rendered in a sandboxed iframe. GeoGebra embeds are loaded through the interactive-content components; lesson GeoGebra activities may be deferred until the learner opens them. Quiz feedback can be presented in the side pane while the question remains in the main pane.
- **Progress:** Lesson starts and completion, practice attempts, assessment activity and related dashboard information are persisted through the progress/data-access layer. UI completion controls must not be treated as proof of persistence until the server operation succeeds.
- **Styling:** Shared platform styles live in `app/globals.css`; feature-specific styles and responsive layout rules are colocated with components where appropriate. Respect reduced-motion preferences and mobile usability when changing lesson transitions or layouts.

These boundaries are intended to keep authorization and data ownership in server/database layers rather than relying on hidden links or client-side checks.

### Lesson content and authoring

The admin lesson editor supports these block types:

| Block | Typical use |
| --- | --- |
| `heading` | Section or step heading |
| `text`, `markdown` | Explanatory prose and formatted content |
| `math` | Mathematical expression |
| `worked-example` | Prompt, solution, and optional Markdown content |
| `callout` | Information, tip, or warning |
| `image` | Uploaded or referenced image with alternative text and optional caption |
| `video` | Lesson video or supported video source |
| `interactive` | Configured GeoGebra or custom activity |
| `visualizer` | Sandboxed custom HTML board/visualization |
| `question` | Reference to a question-bank item |
| `quiz` | In-lesson multiple-choice check (`mid` or `end`) |

Blocks can be ordered within a lesson and assigned to a step. A split lesson can assign a block to the main or side pane; blocks without a pane assignment use the main pane. Steps are presented in lesson order. The end quiz variant supports a second attempt after a wrong answer and reveals the correct answer and explanation if needed. An unfinished end check can gate progression according to the lesson flow.

When editing or importing content, preserve stable block IDs, valid asset/question references, the course/week/day hierarchy, publication rules, and the existing validation performed by the application. Do not paste private student data into lesson content or commit credentials into visualizer source.

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
| `npm run smoke:course-structure` | Check the course structure |
| `npm run smoke:day-content` | Check Day content (same script as course structure) |
| `npm run smoke:questions-assessments` | Check question and assessment flows/data |
| `npm run smoke:resources-course-materials-assets` | Check resource, materials, and asset integration |
| `npm run smoke:progress` | Check progress behavior |
| `npm run smoke:published-day` | Check published Day content |
| `npm run smoke:published-structure` | Check published course structure |
| `npm run smoke:course-content` | Check course content |
| `npm run verify:profile-edit` | Verify profile editing |
| `npm run verify:day-persistence` | Verify Day persistence |
| `npm run verify:day-transfer` | Verify Day transfer behavior |
| `npm run verify:question-read-boundary` | Verify question read boundaries |
| `npm run verify:resource-read-boundary` | Verify resource read boundaries |
| `npm run verify:asset-read-boundary` | Verify asset read boundaries |
| `npm run verify:admin-session-boundary` | Verify admin session boundaries |
| `npm run seed:math151` | Seed Math 151 data; review the script and target environment first |
| `npm run seed:math151:check` | Check Math 151 seed data without applying it |

**Caution:** Seed commands may write data. Use only an authorized development or staging project, and inspect the seed script before running it. Do not run seed scripts against production unless the data change is intentionally approved.

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

Deploy the Next.js application using a platform that supports Next.js (for example, Vercel) or another compatible Node.js hosting provider. The intended production deployment branch for the Vercel project is `main`.

For a deployment:

1. Connect the application repository and set the app's root/build directory to this repository root.
2. Set Vercel's **Production Branch** to `main`. A push or merge to `main` should be the production deployment trigger; pushes to `master` should not replace or change that production branch.
3. Configure all required environment variables in the hosting provider's server-side environment settings.
4. Apply pending Supabase migrations to the intended database.
5. Verify that Supabase Auth redirect URLs and allowed origins include the deployed domain.
6. Run the production build and check student signup, sign-in, password reset, course browsing, lesson progression, progress persistence, and admin access.
7. Confirm that secrets are available only to server runtime code and are not included in client bundles.
8. Enable Web Analytics for the Vercel project in the Vercel dashboard. The app includes the `@vercel/analytics/next` component; analytics data is collected after deployment when the Vercel project has Analytics enabled. Browser content blockers can prevent some visits from being recorded.

Production deployments should use a separate Supabase project (or otherwise deliberately isolated data) from development. Do not deploy with placeholder environment values.

### Git branches and deployment workflow

- **`main` is the deployment branch.** Merge or push release-ready changes to `main` to trigger the Vercel production deployment, provided the Vercel project's Production Branch is configured as `main`.
- **`master` is a compatibility/mirror branch.** If the team needs the same release on `master`, merge `main` into `master` and push it after the `main` deployment is initiated. Do not use `master` as the Vercel Production Branch unless the deployment policy is deliberately changed.
- **The GitHub remotes:** `origin` is `studysupport-ato/firstprinciple`; `alt` is `Kwasnega/backtobasics`. Check `git remote -v` in the local clone before pushing, because remotes and branch histories can change.
- **Keep branch history safe.** Fetch before merging, review `git status` and branch differences, use fast-forward pulls where possible, and resolve merge conflicts without force-pushing over existing branch history.

Example synchronization commands (review the output at each stage):

```bash
git fetch --all --prune
git switch main
git pull --ff-only origin main
# Make and verify the intended changes, then commit them.
git push origin main

# Optional compatibility-branch sync after the main deployment is triggered:
git switch master
git merge main
git push origin master
```

The Vercel project configuration is managed in the Vercel dashboard. README guidance does not itself change the project's Production Branch setting; confirm that setting in Vercel before relying on automatic production deployments.

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
