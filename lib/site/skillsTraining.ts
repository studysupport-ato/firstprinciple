/**
 * The Arduino Skills Training section at the top of the front page.
 *
 * - `live: false` shows the new front page only to a signed-in admin.
 *   Everyone else keeps seeing the old front page. Set it to `true` to make
 *   the new front page public.
 * - Paste the registration Google Doc / Form link into `registerUrl`; until
 *   then the Register button reads "Registration link coming soon".
 */
export const SKILLS_TRAINING = {
  live: false,
  registerUrl: null as string | null,
  courses: [
    "Virtual Reality Essentials",
    "Computer Aided Design",
    "Introduction to Software Engineering with Python",
    "AI Prompt Engineering",
  ],
};
