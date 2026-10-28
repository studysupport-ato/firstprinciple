import { ArrowRight, Box, Code, Glasses, Sparkles, type LucideIcon } from "lucide-react";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";

const goldGround = {
  backgroundColor: "#E9BC3A",
  backgroundImage:
    "linear-gradient(rgba(26,24,20,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(26,24,20,.07) 1px, transparent 1px), var(--gold-sweep)",
  backgroundSize: "32px 32px, 32px 32px, auto",
} as const;

// The training title is set in Futura; Outfit (the site's Futura-style
// heading face) stands in on phones that do not ship Futura.
const futura = { fontFamily: 'Futura, "Futura PT", var(--font-outfit), ui-sans-serif, sans-serif' } as const;

const eyebrow = "text-[12px] font-extrabold uppercase tracking-[0.16em]";

const COURSE_ICONS: Record<string, LucideIcon> = {
  "Virtual Reality Essentials": Glasses,
  "Computer Aided Design": Box,
  "Introduction to Software Engineering with Python": Code,
  "AI Prompt Engineering": Sparkles,
};

export function SkillsTraining() {
  const { registerUrl, courses, slots, backgroundLogo } = SKILLS_TRAINING;

  return (
    <section id="arduino-training" className="relative scroll-mt-20 overflow-hidden" style={goldGround}>
      {backgroundLogo ? (
        // The College of Engineering logo, faded into the gold like a watermark.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-no-repeat opacity-[0.16] mix-blend-multiply [background-position:right_-8%_top_6%] [background-size:min(78vw,640px)] [mask-image:radial-gradient(circle_at_80%_30%,#000_25%,transparent_70%)]"
          style={{ backgroundImage: `url(${backgroundLogo})` }}
        />
      ) : null}

      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pb-10 pt-6 md:gap-10 md:px-6 md:pb-20 md:pt-14">
        {/* The collaboration comes first */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3 md:gap-5">
            <img
              src="/logobg.png"
              alt="Back2Basics with Kwamina"
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_4px_14px_rgba(26,24,20,.25)] md:h-20 md:w-20"
            />
            <span aria-hidden="true" className="text-[20px] font-black text-[#1A1814]/60 md:text-[24px]">
              ×
            </span>
            {/* Innovation Centre lockup: logo | name */}
            <div className="flex items-center gap-2.5 md:gap-4">
              <img
                src="/home/innovation-centre-logo.png"
                alt=""
                width={61}
                height={64}
                className="h-14 w-auto shrink-0 rounded-2xl shadow-[0_4px_14px_rgba(26,24,20,.25)] md:h-20"
              />
              <span aria-hidden="true" className="h-12 w-[2px] shrink-0 bg-[#1A1814]/45 md:h-16" />
              <span className="flex flex-col text-left leading-[1.1] text-[#1A1814]">
                <span className="text-[15px] font-black md:text-[22px]">Innovation Centre</span>
                <span className="text-[13px] font-medium md:text-[19px]">College of Engineering</span>
              </span>
            </div>
          </div>
          <p className={`${eyebrow} text-[#1A1814]/70`}>Back2Basics in collaboration with the</p>
          <p className="max-w-[760px] text-[24px] font-black uppercase leading-[1.1] tracking-[0.01em] text-[#1A1814] md:text-[36px]" style={futura}>
            Innovation Centre of the College of Engineering
          </p>
        </div>

        {/* The free Arduino training */}
        <div className="flex flex-wrap items-center gap-5 rounded-[28px] bg-[#F6EFDC]/55 p-5 shadow-[0_10px_30px_rgba(26,24,20,.12)] backdrop-blur-[2px] md:gap-12 md:p-10">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4 md:gap-5">
            <h1 className="uppercase leading-[0.95] tracking-[0.01em]" style={futura}>
              <span className="mb-2 inline-block -rotate-2 rounded-xl bg-[#1A1814] px-3 pb-0.5 pt-1.5 text-[46px] font-black leading-none text-[#E9BC3A] shadow-[0_6px_18px_rgba(26,24,20,.3)] md:text-[72px]">
                Free
              </span>
              <span className="block text-[54px] font-bold text-[#8F6500] md:text-[88px]">Arduino</span>
              <span className="block text-[34px] font-bold text-[#1A1814] md:text-[56px]">Skills Training</span>
            </h1>
            <p className="max-w-[580px] text-[17px] font-medium leading-relaxed text-[#26231C] md:text-[19px]">
              Calling all student engineers to register for our{" "}
              <strong className="rounded-md bg-[#1A1814] px-1.5 py-0.5 font-black uppercase text-[#E9BC3A]">free</strong>{" "}
              <strong className="font-extrabold">practical Arduino Training</strong>. It costs you nothing.
            </p>
            <div className="flex flex-wrap gap-3">
              {registerUrl ? (
                <a
                  href={registerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-[#1A1814] px-5 py-3.5 text-[16px] font-bold text-[#F6EFDC] hover:bg-black"
                >
                  Register for <strong className="font-black uppercase text-[#E9BC3A]">free</strong> <ArrowRight size={18} strokeWidth={2.6} className="text-[#E9BC3A]" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-[44px] items-center rounded-2xl border-2 border-dashed border-[#1A1814]/50 px-5 py-3.5 text-[16px] font-bold text-[#1A1814]/75"
                >
                  Registration link coming soon
                </span>
              )}
            </div>
          </div>

          {/* Limited slots */}
          <div className="flex min-w-0 flex-[1_1_260px] items-center gap-4 rounded-[24px] bg-[#1A1814] px-5 py-4 text-[#F6EFDC] md:max-w-[340px] md:flex-col md:gap-1 md:px-6 md:py-7 md:text-center">
            <p className="text-[64px] font-black leading-[0.9] text-[#E9BC3A] md:order-2 md:text-[104px]" style={futura}>
              {slots}
            </p>
            <div className="flex flex-col gap-1 md:contents">
              <p className={`${eyebrow} text-[#E9BC3A] md:order-1`}>Limited slots</p>
              <p className="text-[17px] font-bold md:order-3 md:text-[18px]">Only {slots} people</p>
              <p className="text-[13.5px] font-semibold leading-snug text-[#F6EFDC]/80 md:order-4 md:mt-3 md:border-t md:border-[#F6EFDC]/15 md:pt-3 md:text-[14.5px]">
                First come, first served. Register early to secure your place.
              </p>
            </div>
          </div>
        </div>

        {/* Discounted courses */}
        <div id="additional-courses" className="scroll-mt-20 overflow-hidden rounded-[28px] bg-[#1A1814] text-[#F6EFDC] shadow-[0_18px_50px_rgba(26,24,20,.35)]">
          <div className="flex flex-col gap-5 p-5 md:gap-6 md:p-10">
            <div>
              <div className="flex max-w-[680px] flex-col gap-3">
                <span className="self-start rounded-lg bg-[#E9BC3A] px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.1em] text-[#1A1814]">
                  Plus: discounted courses
                </span>
                <h2 className="text-[28px] font-black uppercase leading-[1] text-[#E9BC3A] md:text-[44px]" style={futura}>
                  Go further for less
                </h2>
                <p className="text-[15.5px] font-semibold leading-relaxed text-[#F6EFDC]/85 md:text-[18px]">
                  With an option to register for the following courses at a discounted price with flexible payment plan:
                </p>
              </div>
            </div>

            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              {courses.map((course) => {
                const Icon = COURSE_ICONS[course] ?? Sparkles;
                return (
                  <li key={course} className="flex items-center gap-3 rounded-[16px] bg-[#E9BC3A] p-3 text-[#1A1814] sm:flex-col sm:items-start sm:gap-4 sm:rounded-[20px] sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-11 sm:w-11 bg-[#1A1814] text-[#E9BC3A]" aria-hidden="true">
                      <Icon size={22} strokeWidth={2.2} />
                    </span>
                    <span className="text-[16px] font-extrabold leading-tight sm:text-[19px]">{course}</span>
                    <span className="mt-auto hidden self-start rounded-full bg-[#1A1814]/10 sm:inline px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em]">
                      Discounted
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3 bg-[#E9BC3A]/15 pl-6 md:pl-10">
            <p className="py-4 text-[16px] font-extrabold leading-snug text-[#E9BC3A] md:py-5 md:text-[20px]">
              Official Certificates of Completion are assured
            </p>
            <img src="/home/vr-student.jpg" alt="A student smiling while using a VR headset" width={250} height={310} className="block h-[96px] w-auto md:h-[160px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
