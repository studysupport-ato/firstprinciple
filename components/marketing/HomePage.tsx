"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { COLLABORATE } from "@/lib/site/collaborate";

const goldGround = {
  backgroundColor: "#E9BC3A",
  backgroundImage:
    "linear-gradient(rgba(26,24,20,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(26,24,20,.07) 1px, transparent 1px), var(--gold-sweep)",
  backgroundSize: "32px 32px, 32px 32px, auto",
} as const;

const darkGrid = {
  backgroundColor: "#1A1814",
  backgroundImage:
    "linear-gradient(rgba(246,239,220,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(246,239,220,.05) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
} as const;

const PILLARS = [
  { title: "Academics", text: "Help you truly understand your courses, one step at a time.", status: "In progress", ready: true },
  { title: "Real-world skills", text: "Teach the practical skills industry looks for.", status: "Coming soon", ready: false },
  { title: "Real-life opportunities", text: "Connect what you learn to real openings.", status: "Coming soon", ready: false },
];

const eyebrow = "text-[12px] font-extrabold uppercase tracking-[0.16em]";
const sectionTitle = "font-sans text-[32px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[44px]";

export function HomePage({ firstLessonHref }: { firstLessonHref: string | null }) {
  const lessonHref = firstLessonHref ?? "/courses";

  return (
    <div className="min-h-screen text-[#1A1814]" style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
      <main>
        {/* Opening */}
        <section className="relative overflow-hidden" style={goldGround}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[62%] bg-cover opacity-[0.32] mix-blend-multiply grayscale [mask-image:linear-gradient(90deg,transparent,#000_45%)]"
            style={{ backgroundImage: "url(/courses.jpeg)", backgroundPosition: "center 30%" }}
          />
          <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5 pb-12 pt-8 md:px-6 md:pb-24 md:pt-20">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
              <p className={`${eyebrow} text-[#1A1814]/75`}>Actualize tomorrow&apos;s outcome now</p>
              <h1 className="font-sans text-[44px] font-black leading-[1] tracking-[-0.03em] md:text-[68px]">
                Strong basics today.
                <br />
                Real opportunities tomorrow.
              </h1>
              <p className="max-w-[580px] text-[17px] font-medium leading-relaxed text-[#26231C] md:text-[19px]">
                Back2Basics stands on three pillars: academics, real-world skills and real-life opportunities. The academic side is open now and growing every week.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link href={lessonHref} className="inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-[#1A1814] px-5 py-3.5 text-[16px] font-bold text-[#F6EFDC] hover:bg-black">
                  Start the first lesson <ArrowRight size={18} strokeWidth={2.6} className="text-[#E9BC3A]" />
                </Link>
                <Link href="/questions" className="inline-flex min-h-[44px] items-center rounded-2xl border-2 border-[#1A1814] px-5 py-3.5 text-[16px] font-bold hover:bg-[#1A1814]/10">
                  Try a self test
                </Link>
              </div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1814]/80">
                <Check size={18} strokeWidth={2.6} aria-hidden="true" className="shrink-0" /> The first lesson in each topic is open to everyone, no sign-up needed. To access the rest of the lessons, sign up for free.
              </p>
            </div>
            <figure className="m-0 min-w-0 flex-[1_1_420px] rounded-[26px] bg-[#1A1814] p-4 shadow-[0_18px_50px_rgba(26,24,20,.35)]">
              <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#E9BC3A]">Inside a lesson · Algebra</span>
                <span className="text-[12px] font-semibold text-[#F6EFDC]/65">Step 7 of 7</span>
              </div>
              <img
                src="/home/powers-of-i.webp"
                alt="A lesson board showing every power of i from i to the 0 up to i to the 20 landing on four points of the complex plane"
                width={460}
                height={600}
                className="block h-auto w-full rounded-2xl"
              />
              <figcaption className="px-1.5 pb-1 pt-3 text-[14px] leading-relaxed text-[#F6EFDC]/85">
                Twenty quarter turns are five full circles: every power of <i>i</i> lands on one of four points.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* The three pillars */}
        <section id="pillars" className="scroll-mt-20 bg-[#F6EFDC]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-12 gap-y-6 px-5 py-16 md:px-6 md:py-20">
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
              <p className={`${eyebrow} text-[#8F6500]`}>What we are building</p>
              <h2 className={sectionTitle}>Three pillars.</h2>
            </div>
            <ol className="m-0 flex min-w-0 flex-[2_1_520px] list-none flex-col p-0">
              {PILLARS.map((pillar, index) => (
                <li key={pillar.title} className={`flex items-baseline gap-[18px] border-t border-[#1A1814]/15 py-[18px] ${index === PILLARS.length - 1 ? "border-b" : ""}`}>
                  <span className="w-7 flex-none font-sans text-[18px] font-black tabular-nums text-[#8F6500]">0{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-[21px] font-extrabold">{pillar.title}</h3>
                    <p className="mt-0.5 text-[15.5px] leading-normal text-[#3A352B]">{pillar.text}</p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] ${
                      pillar.ready ? "bg-[#E9BC3A]" : "border border-[#1A1814]/45"
                    }`}
                  >
                    {pillar.status}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Collaborate */}
        <section id="collaborate" className="scroll-mt-20" style={goldGround}>
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-10 px-5 py-16 md:px-6 md:py-20">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
              <p className={`${eyebrow} text-[#8F6500]`}>Build it with us</p>
              <h2 className={sectionTitle}>We haven&apos;t had everything figured out, we need you.</h2>
              <p className="max-w-[580px] text-[17px] leading-relaxed text-[#26231C]">
                Back2Basics benefits all of us, so we need everyone on board to execute it. If you are willing to collaborate, send us a DM on any of our socials or fill in our collaboration form.
              </p>
            </div>
            <div className="flex min-w-0 flex-[0_1_360px] flex-col gap-3">
              {COLLABORATE.socials.length ? (
                <div className="flex flex-wrap gap-2">
                  {COLLABORATE.socials.map((social) => (
                    <a key={social.href} href={social.href} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#1A1814] px-4 text-[15px] font-bold text-[#F6EFDC] hover:bg-black">
                      {social.name} <span className="font-semibold text-[#F6EFDC]/70">{social.handle}</span>
                    </a>
                  ))}
                </div>
              ) : null}
              {COLLABORATE.formUrl ? (
                <a href={COLLABORATE.formUrl} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center rounded-2xl bg-[#1A1814] px-5 py-4 text-[17px] font-extrabold text-[#F6EFDC] hover:bg-black">
                  Fill the collaboration form
                </a>
              ) : (
                <span aria-disabled="true" className="flex min-h-[44px] items-center justify-center rounded-2xl border-2 border-dashed border-[#1A1814]/50 px-5 py-4 text-[16px] font-bold text-[#1A1814]/75">
                  Collaboration form · link coming soon
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
