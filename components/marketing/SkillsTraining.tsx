import { ArrowRight, ChevronRight, Users } from "lucide-react";
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

export function SkillsTraining() {
  const { registerUrl, courses } = SKILLS_TRAINING;

  return (
    <section id="arduino-training" className="relative scroll-mt-20 overflow-hidden" style={goldGround}>
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-8 px-5 pb-12 pt-8 md:px-6 md:pb-24 md:pt-14">
        {/* Back2Basics x Innovation Centre */}
        <div className="flex items-center justify-center gap-4">
          <img
            src="/logobg.png"
            alt="Back2Basics with Kwamina"
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl shadow-[0_4px_14px_rgba(26,24,20,.25)] md:h-20 md:w-20"
          />
          <span aria-hidden="true" className="text-[22px] font-black text-[#1A1814]/60">
            ×
          </span>
          <img
            src="/home/innovation-centre-logo.png"
            alt="Innovation Centre, College of Engineering"
            width={61}
            height={64}
            className="h-16 w-auto rounded-2xl shadow-[0_4px_14px_rgba(26,24,20,.25)] md:h-20"
          />
        </div>

        <div className="flex flex-wrap items-start gap-12">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
            <h1 className="uppercase leading-[0.95] tracking-[0.01em]" style={futura}>
              <span className="block text-[54px] font-bold text-[#8F6500] md:text-[92px]">Arduino</span>
              <span className="block text-[34px] font-bold text-[#1A1814] md:text-[58px]">Skills Training</span>
            </h1>

            <p className="max-w-[580px] text-[17px] font-medium leading-relaxed text-[#26231C] md:text-[19px]">
              <strong className="font-extrabold">Back2Basics</strong> in collaboration with the{" "}
              <strong className="font-extrabold">Innovation Centre of the College of Engineering</strong> is calling for student
              engineers to register for our{" "}
              <mark className="rounded-md bg-[#1A1814] px-1.5 py-0.5 font-extrabold text-[#E9BC3A] [box-decoration-break:clone]">
                free practical Arduino Training
              </mark>
              .
            </p>

            <div className="flex max-w-[580px] items-start gap-3 rounded-2xl border-2 border-[#1A1814] bg-[#F6EFDC]/70 px-4 py-3.5">
              <Users size={22} strokeWidth={2.4} aria-hidden="true" className="mt-0.5 shrink-0" />
              <p className="text-[15.5px] font-semibold leading-snug text-[#1A1814]">
                <strong className="font-extrabold">Slots are limited.</strong> Places are given on a first come, first served
                basis, so register early.
              </p>
            </div>

            <div className="mt-1 flex flex-wrap gap-3">
              {registerUrl ? (
                <a
                  href={registerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-[#1A1814] px-5 py-3.5 text-[16px] font-bold text-[#F6EFDC] hover:bg-black"
                >
                  Register for free <ArrowRight size={18} strokeWidth={2.6} className="text-[#E9BC3A]" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-[44px] items-center rounded-2xl border-2 border-dashed border-[#1A1814]/50 px-5 py-3.5 text-[16px] font-bold text-[#1A1814]/75"
                >
                  Registration link coming soon
                </span>
              )}
              <a href="#additional-courses" className="inline-flex min-h-[44px] items-center rounded-2xl border-2 border-[#1A1814] px-5 py-3.5 text-[16px] font-bold hover:bg-[#1A1814]/10">
                See discounted courses
              </a>
            </div>
          </div>

          <div id="additional-courses" className="min-w-0 flex-[1_1_420px] scroll-mt-20 overflow-hidden rounded-[26px] bg-[#1A1814] text-[#F6EFDC] shadow-[0_18px_50px_rgba(26,24,20,.35)]">
            <div className="flex flex-col gap-4 p-6 md:p-7">
              <span className="self-start rounded-lg bg-[#E9BC3A] px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
                Discounted courses
              </span>
              <p className="text-[16px] font-semibold leading-relaxed text-[#F6EFDC]/85">
                With an option to register for the following courses at a discounted price with flexible payment plan:
              </p>
              <ul className="m-0 flex list-none flex-col p-0">
                {courses.map((course, index) => (
                  <li
                    key={course}
                    className={`flex min-h-[48px] items-center gap-3 py-2 text-[18px] font-bold text-[#E9BC3A] ${
                      index < courses.length - 1 ? "border-b border-[#F6EFDC]/10" : ""
                    }`}
                  >
                    <ChevronRight size={18} strokeWidth={2.8} aria-hidden="true" className="shrink-0" />
                    {course}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-end justify-between gap-3 bg-[#E9BC3A] pl-6 md:pl-7">
              <p className="py-5 text-[17px] font-extrabold leading-snug text-[#1A1814]">
                Official Certificates of Completion are assured
              </p>
              <img src="/home/vr-student.jpg" alt="A student smiling while using a VR headset" width={250} height={310} className="block h-[150px] w-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
