"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Briefcase, Check, Wrench } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { COLLABORATE } from "@/lib/site/collaborate";

type AuthView = "login" | "signup";

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

const eyebrow = "text-[12px] font-extrabold uppercase tracking-[0.16em]";
const sectionTitle = "font-sans text-[32px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[44px]";

export function HomePage({ firstLessonHref }: { firstLessonHref: string | null }) {
  const [auth, setAuth] = useState<AuthView | null>(null);
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
                Back2Basics stands on three pillars: academic support, real-world skills for industry, and real-life opportunities. The academic side is open now and growing every week.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link href={lessonHref} className="inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-[#1A1814] px-5 py-3.5 text-[16px] font-bold text-[#F6EFDC] hover:bg-black">
                  Start a free lesson <ArrowRight size={18} strokeWidth={2.6} className="text-[#E9BC3A]" />
                </Link>
                <Link href="/questions" className="inline-flex min-h-[44px] items-center rounded-2xl border-2 border-[#1A1814] px-5 py-3.5 text-[16px] font-bold hover:bg-[#1A1814]/10">
                  Try a self test
                </Link>
              </div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1814]/80">
                <Check size={18} strokeWidth={2.6} aria-hidden="true" /> The first lesson of every topic is free. No account needed.
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
          <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-5 py-16 md:px-6 md:py-20">
            <div className="flex max-w-[720px] flex-col gap-2.5">
              <p className={`${eyebrow} text-[#8F6500]`}>The three pillars</p>
              <h2 className={sectionTitle}>From the classroom to the workplace.</h2>
            </div>
            <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              <Pillar
                number={1}
                title="Academics"
                badge="Work in progress"
                ready
                icon={<BookOpen size={24} strokeWidth={2.2} />}
                text="Self-paced courses that show every step, self tests with answers, and course materials in one place. Open now, with more added as we build."
                link={{ label: "Start learning", href: "/courses" }}
              />
              <Pillar
                number={2}
                title="Real-world skills for industry"
                badge="Coming soon"
                icon={<Wrench size={24} strokeWidth={2.2} />}
                text="Practical skills that employers look for, taught the same step-by-step way. This phase is coming soon."
                onNotify={() => setAuth("signup")}
              />
              <Pillar
                number={3}
                title="Real-life opportunities"
                badge="Coming soon"
                icon={<Briefcase size={24} strokeWidth={2.2} />}
                text="A route from what you learn to real openings. This pillar is coming soon."
                onNotify={() => setAuth("signup")}
              />
            </div>
          </div>
        </section>

        {/* Self-paced courses */}
        <section id="courses" className="scroll-mt-20" style={goldGround}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-16 md:px-6 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-2.5">
                <p className={`${eyebrow} text-[#1A1814]/75`}>Academics · self-paced courses</p>
                <h2 className={sectionTitle}>Mathematics, one step at a time.</h2>
              </div>
              <p className="max-w-[400px] text-[15px] font-semibold text-[#1A1814]/80">
                Our self-paced courses focus on mathematics. Algebra is open now; other mathematics courses are still under construction.
              </p>
            </div>
            <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <Link href={lessonHref} className="group flex flex-col gap-3.5 rounded-[24px] bg-[#1A1814] p-6 text-[#F6EFDC] transition-transform hover:-translate-y-1 md:p-7">
                <span className="self-start rounded-lg bg-[#E9BC3A] px-3 py-1.5 text-[11px] font-black tracking-[0.08em] text-[#1A1814]">OPEN NOW</span>
                <span className="font-sans text-[30px] font-black leading-[1.05]">Algebra</span>
                <span className="text-[14.5px] leading-relaxed text-[#F6EFDC]/75">Real numbers, induction, complex numbers and vectors, with every proof built line by line.</span>
                <span className="flex flex-wrap gap-2 text-[12.5px] font-bold">
                  <span className="rounded-full bg-[#F6EFDC]/10 px-2.5 py-1.5">5 topics</span>
                  <span className="rounded-full bg-[#F6EFDC]/10 px-2.5 py-1.5">35 lessons</span>
                  <span className="rounded-full bg-[#F6EFDC]/10 px-2.5 py-1.5">Self tests</span>
                </span>
                <span className="mt-1.5 flex items-center justify-between text-[15px] font-extrabold text-[#E9BC3A]">
                  Start lesson 1 free
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                    <ArrowRight size={18} strokeWidth={2.6} />
                  </span>
                </span>
              </Link>
              <div className="flex flex-col justify-center gap-3.5 rounded-[24px] border-2 border-dashed border-[#1A1814]/45 p-6 md:p-7">
                <span className="self-start rounded-lg border border-[#1A1814]/50 px-3 py-1.5 text-[11px] font-black tracking-[0.08em]">UNDER CONSTRUCTION</span>
                <span className="font-sans text-[26px] font-black leading-[1.1]">More mathematics courses</span>
                <span className="text-[14.5px] leading-relaxed text-[#1A1814]/80">The next mathematics courses are being built now. Sign up and we will tell you when they open.</span>
                <button type="button" onClick={() => setAuth("signup")} className="self-start text-[15px] font-extrabold underline-offset-4 hover:underline">
                  Notify me →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Collaborate */}
        <section id="collaborate" className="scroll-mt-20 bg-[#F6EFDC]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-10 px-5 py-16 md:px-6 md:py-20">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
              <p className={`${eyebrow} text-[#8F6500]`}>Build it with us</p>
              <h2 className={sectionTitle}>This works when everyone is on board.</h2>
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

        {/* Sign up */}
        <section className="text-[#F6EFDC]" style={darkGrid}>
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-10 px-5 py-16 md:px-6 md:py-20">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-4">
              <p className={`${eyebrow} text-[#E9BC3A]`}>Be there from the start</p>
              <h2 className="font-sans text-[32px] font-black leading-[1.04] tracking-[-0.02em] md:text-[48px]">Industry skills and opportunities are on the way.</h2>
              <p className="max-w-[560px] text-[17px] leading-relaxed text-[#F6EFDC]/80">
                Create a free account to keep your progress in the courses and self tests, and to hear first when the next two pillars open.
              </p>
            </div>
            <div className="flex min-w-0 flex-[0_1_340px] flex-col gap-3">
              <button type="button" onClick={() => setAuth("signup")} className="flex min-h-[44px] items-center justify-center rounded-2xl bg-[#E9BC3A] px-5 py-4 text-[17px] font-extrabold text-[#1A1814] hover:bg-[#F2CC5C]">
                Sign up free
              </button>
              <button type="button" onClick={() => setAuth("login")} className="flex min-h-[44px] items-center justify-center rounded-2xl border border-[#F6EFDC]/30 px-5 py-4 text-[16px] font-bold hover:border-[#F6EFDC]/70">
                I already have an account
              </button>
            </div>
          </div>
        </section>
      </main>


      <AuthModal open={auth !== null} initialView={auth ?? "login"} onClose={() => setAuth(null)} redirectTo="/courses" />
    </div>
  );
}

function Pillar({
  number,
  title,
  badge,
  ready = false,
  icon,
  text,
  link,
  onNotify,
}: {
  number: number;
  title: string;
  badge: string;
  ready?: boolean;
  icon: React.ReactNode;
  text: string;
  link?: { label: string; href: string };
  onNotify?: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-3.5 rounded-[24px] p-7 text-[#F6EFDC] ${
        ready ? "bg-[#1A1814]" : "bg-[#26231C] outline-dashed outline-2 -outline-offset-8 outline-[#E9BC3A]/55"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${ready ? "bg-[#E9BC3A] text-[#1A1814]" : "bg-[#E9BC3A]/20 text-[#E9BC3A]"}`} aria-hidden="true">
          {icon}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${
            ready ? "bg-[#E9BC3A] text-[#1A1814]" : "border border-[#F6EFDC]/40"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#F6EFDC]/60">Pillar {number}</p>
      <h3 className="font-sans text-[26px] font-extrabold leading-tight">{title}</h3>
      <p className="text-[15.5px] leading-relaxed text-[#F6EFDC]/80">{text}</p>
      {link ? (
        <Link href={link.href} className="mt-auto text-[14px] font-extrabold text-[#E9BC3A] hover:underline">
          {link.label} →
        </Link>
      ) : (
        <button type="button" onClick={onNotify} className="mt-auto self-start text-[14px] font-extrabold text-[#E9BC3A] hover:underline">
          Get notified →
        </button>
      )}
    </div>
  );
}
