import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Back2Basics with Kwamina",
  description: "What Back2Basics with Kwamina collects, why, and how it is used, including Google Drive access for course material uploads.",
};

const sections: Array<{ title: string; paragraphs: string[]; list?: string[] }> = [
  {
    title: "1. Who we are",
    paragraphs: [
      "Back2Basics with Kwamina (“Back2Basics”, “we”) runs the learning platform at b2bwithkwamina.com for engineering students. This policy explains what information we collect, why, and what we do with it.",
    ],
  },
  {
    title: "2. What we collect",
    paragraphs: ["We only collect what we need to run the Platform:"],
    list: [
      "Account details: your name, email address and sign-in information.",
      "Profile and study details you give us, such as your programme, year and semester, so we can show you the right course materials.",
      "Learning activity: lessons opened, answers to practice questions and your progress, so you can continue where you stopped.",
      "Course rep applications: full name, programme, year and phone number, so we can confirm course reps and contact them by text about their application.",
      "Files course reps upload, such as lecture slides, together with the course they belong to.",
      "Basic technical information, such as device type and pages visited, to keep the Platform working and improve it.",
    ],
  },
  {
    title: "3. Google Drive",
    paragraphs: [
      "Course materials uploaded by approved course reps are stored in a Google Drive account owned by Back2Basics. The Platform connects to that account using Google’s “drive.file” permission, which only allows it to see and manage files and folders it created itself. It cannot see, change or delete any other file in that Drive, and it does not access any student’s or course rep’s own Google Drive.",
      "Uploaded files are shared so that anyone with the link can view them, because they are course materials meant for students. Do not upload personal documents.",
      "Back2Basics’ use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
    ],
  },
  {
    title: "4. How we use information",
    paragraphs: [
      "We use information to provide and improve the Platform, show you relevant materials, save your progress, review course rep applications, send messages you would expect (such as account, application and important course announcements), keep the Platform secure, and meet legal obligations.",
      "We do not sell your personal information, and we do not use it for third-party advertising.",
    ],
  },
  {
    title: "5. Who we share it with",
    paragraphs: [
      "We use trusted service providers to run the Platform, including hosting (Vercel), database and sign-in (Supabase), file storage (Google Drive), email and text messaging providers. They process information only to provide their service to us. We may also share information when the law requires it.",
    ],
  },
  {
    title: "6. Keeping and deleting information",
    paragraphs: [
      "We keep information for as long as your account is active or as needed to provide the Platform. You can ask us to correct or delete your account information at any time through the contact options on the Platform. Course materials uploaded by course reps may stay available to students after a rep’s access ends.",
    ],
  },
  {
    title: "7. Changes and contact",
    paragraphs: [
      "We may update this policy; the date above shows the latest version. For any privacy question or request, contact Back2Basics through the contact options on the Platform.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-10 text-[#111111] sm:px-6 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-[28px] border border-[#E5E5E5] bg-white px-6 py-8 shadow-[0_24px_60px_rgba(17,17,17,0.04)] sm:px-12 sm:py-12">
        <Link href="/" className="text-sm font-semibold text-[#555555] underline-offset-4 hover:text-[#111111] hover:underline">
          ← Back2Basics with Kwamina
        </Link>
        <header className="mt-8 border-b border-[#E5E5E5] pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#777777]">Legal</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-[#666666]">Last updated: November 4, 2026</p>
        </header>
        <div className="divide-y divide-[#EEEEEC]">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="font-serif text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-4 text-[15px] leading-7 text-[#444444]">
                {section.paragraphs.map((p) => <p key={p}>{p}</p>)}
                {section.list ? <ul className="list-disc space-y-2 pl-6">{section.list.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              </div>
            </section>
          ))}
        </div>
        <footer className="border-t border-[#E5E5E5] pt-6 text-sm text-[#666666]">
          See also our <Link href="/terms" className="underline underline-offset-4">Terms and Conditions</Link>.
        </footer>
      </article>
    </main>
  );
}
