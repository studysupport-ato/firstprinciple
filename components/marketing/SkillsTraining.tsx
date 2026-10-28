import { ArrowRight, Check, ChevronRight } from "lucide-react";
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

export function SkillsTraining() {
  const { registerUrl, courses } = SKILLS_TRAINING;

  return (
    <section id="arduino-training" className="relative scroll-mt-20 overflow-hidden" style={goldGround}>
      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5 pb-12 pt-8 md:px-6 md:pb-24 md:pt-20">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <img
              src="/home/innovation-centre-logo.png"
              alt="Innovation Centre, College of Engineering"
              width={48}
              height={50}
              className="h-[50px] w-auto rounded-xl"
            />
            <p className={`${eyebrow} text-[#1A1814]/75`}>Back2Basics presents</p>
          </div>

          <h1 className="uppercase leading-[0.95] tracking-[0.01em]" style={futura}>
            <span className="block text-[54px] font-bold text-[#8F6500] md:text-[92px]">Arduino</span>
            <span className="block text-[34px] font-bold text-[#1A1814] md:text-[58px]">Skills Training</span>
          </h1>

          <p className="max-w-[580px] text-[17px] font-medium leading-relaxed text-[#26231C] md:text-[19px]">
            <strong className="font-extrabold">Back2Basics</strong> in collaboration with the{" "}
            <strong className="font-extrabold">Innovation Centre of the College of Engineering</strong> is calling for student
            engineers to register for our free practical Arduino Training.
          </p>

          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {["Free", "Practical", "Official Certificates of Completion"].map((tag) => (
              <li key={tag} className="flex items-center gap-1.5 rounded-full bg-[#1A1814]/10 px-3 py-1.5 text-[14px] font-bold">
                <Check size={16} strokeWidth={2.8} aria-hidden="true" className="shrink-0" /> {tag}
              </li>
            ))}
          </ul>

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
              Additional courses
            </span>
            <p className="text-[16px] font-semibold text-[#F6EFDC]/85">Also explore discounted courses in:</p>
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
    </section>
  );
}
