"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Intensity = "LIGHT" | "MODERATE" | "INTENSE" | "PRACTICE" | "REVIEW";

interface DayBlock {
  days: string;
  intensity: Intensity;
  title: string;
  note: string;
}

const weeks = [
  { week: 1, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Real numbers: N, Z, Q, R", note: "Nested-set picture, closure, and order properties." },
    { days: "DAYS 2-3", intensity: "INTENSE" as Intensity, title: "Mathematical induction", note: "The four cases and the proof structure behind them." },
    { days: "DAY 4", intensity: "LIGHT" as Intensity, title: "Well-ordered sets", note: "One definition, one principle, and one equivalence to remember." },
    { days: "DAY 5", intensity: "PRACTICE" as Intensity, title: "Induction problem set", note: "Work through the exercises before checking the solutions." },
  ]},
  { week: 2, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Where complex numbers come from", note: "Addition and subtraction, made tangible first." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Unit circle, modulus, and argument", note: "Build the Argand diagram as your main tool." },
    { days: "DAY 3", intensity: "MODERATE" as Intensity, title: "Conjugate, multiplication, and division", note: "Rationalising denominators, using the same trick as surds." },
    { days: "DAYS 4-5", intensity: "INTENSE" as Intensity, title: "Polar representation", note: "A careful build-up from rectangular form to polar form." },
  ]},
  { week: 3, days: [
    { days: "DAY 1", intensity: "MODERATE" as Intensity, title: "De Moivre's theorem", note: "The engine behind the rest of this chapter." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Multiplying and dividing in polar form", note: "Angles add while moduli multiply." },
    { days: "DAY 3", intensity: "INTENSE" as Intensity, title: "Cosine identities", note: "Expand, then separate the real and imaginary parts." },
    { days: "DAY 4", intensity: "INTENSE" as Intensity, title: "Nth roots of unity", note: "One formula gives answers evenly spaced around a circle." },
    { days: "DAY 5", intensity: "INTENSE" as Intensity, title: "Polynomial roots and complex powers", note: "Close the chapter with mixed problems." },
  ]},
  { week: 4, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Vector basics", note: "Magnitude, direction, and displacement." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Components and unit vectors", note: "The laws of algebra, now for arrows instead of numbers." },
    { days: "DAY 3", intensity: "MODERATE" as Intensity, title: "Dot product and projection", note: "How much of one vector points along another." },
    { days: "DAYS 4-5", intensity: "INTENSE" as Intensity, title: "Cross product", note: "Perpendicular vectors, triangle areas, and direction." },
  ]},
  { week: 5, days: [
    { days: "DAYS 1-2", intensity: "INTENSE" as Intensity, title: "Linear dependence and independence", note: "Collinear, coplanar, and two ways to test for them." },
    { days: "DAYS 3-4", intensity: "INTENSE" as Intensity, title: "Lines and planes in space", note: "Vector, parametric, and symmetric equations." },
    { days: "DAY 5", intensity: "REVIEW" as Intensity, title: "Half-semester review set", note: "A mixed problem from each of the three chapters." },
  ]},
];

const chapters = [
  { title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", slug: "real-number-theory" },
  { title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", slug: "complex-numbers" },
  { title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", slug: "complex-numbers" },
  { title: "Vector Algebra I", description: "Vectors, components, dot products, projections, and cross products.", slug: "vector-algebra" },
  { title: "Vector Algebra II", description: "Linear dependence, lines, planes, and mixed review.", slug: "vector-algebra" },
];

function lessonSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function intensityLabel(intensity: Intensity) {
  return intensity.charAt(0) + intensity.slice(1).toLowerCase();
}

function intensityClasses(intensity: Intensity) {
  switch (intensity) {
    case "LIGHT":
      return "bg-[#E7F5EC] text-[#2E7D57]";
    case "MODERATE":
      return "bg-[#F8EFD5] text-[#8A6A1A]";
    case "INTENSE":
      return "bg-[#FDE5E5] text-[#B23A3A]";
    case "PRACTICE":
      return "bg-[#F0E9FF] text-[#6750A4]";
    case "REVIEW":
      return "bg-[#E7F0FF] text-[#345FC7]";
    default:
      return "bg-[#F5F5F5] text-[#4B5563]";
  }
}

export default function RoadmapPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return (
    <div className="mx-auto max-w-[1260px] px-5 py-8 md:px-10 md:py-12 xl:px-12">
      <div className="mb-10 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]">
        <Link href={`/courses/${courseId}`} className="transition-colors hover:text-[#111111]">Courses</Link>
        <span className="text-[#D1D5DB]">/</span>
        <Link href={`/courses/${courseId}`} className="font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]">MATH 151</Link>
        <span className="text-[#D1D5DB]">/</span>
        <span>Roadmap</span>
      </div>

      <div className="mb-14 grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-end">
        <AnimatedItem className="xl:col-span-8">
          <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">MATH 151</div>
          <h1 className="editorial-heading mb-5 text-5xl leading-[0.94] md:text-[5.2rem]">Algebra roadmap</h1>
          <p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252] md:text-[1.12rem]">
            Follow the course in order. Each topic opens as its own learning session, so you can move from the outline directly into the ideas and examples.
          </p>
        </AnimatedItem>

        <AnimatedItem delay={0.1} direction="left" className="xl:col-span-4">
          <div className="rounded-[30px] bg-[#121212] p-8 text-white shadow-[0_20px_45px_rgba(17,17,17,0.12)] md:p-9">
            <span className="mb-4 block font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CC3FF]">Course roadmap</span>
            <div className="mb-2 font-serif text-5xl leading-none">25</div>
            <p className="max-w-[16rem] font-sans text-base leading-relaxed text-[#D4D4D8]">
              teaching days across three parts of Algebra.
            </p>
          </div>
        </AnimatedItem>
      </div>

      <div className="space-y-12">
        {weeks.map((week, index) => {
          const chapter = chapters[index];
          return (
            <AnimatedItem key={week.week} delay={index * 0.04}>
              <section>
                <div className="mb-5 flex items-end justify-between gap-4 pb-2">
                  <div>
                    <span className="mb-2 block font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">
                      Week {week.week}
                    </span>
                    <h3 className="font-serif text-[2rem] leading-tight text-[#111111] md:text-[2.5rem]">
                      {chapter.title}
                    </h3>
                    <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#666666] md:text-[0.96rem]">
                      {chapter.description}
                    </p>
                  </div>
                  <span className="hidden font-sans text-sm text-[#666666] md:block">{week.days.length} sessions</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {week.days.map((day: DayBlock) => (
                    <Link
                      key={`${week.week}-${day.title}`}
                      href={`/courses/${courseId}/chapter/${chapter.slug}/lesson/${lessonSlug(day.title)}`}
                      className="group flex items-center justify-between gap-6 rounded-[24px] border border-[#E7E5E2] bg-[#F7F6F3] p-5 transition-all duration-200 hover:border-[#DAD5CE] hover:bg-white hover:shadow-[0_12px_32px_rgba(17,17,17,0.04)] md:p-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
                            {day.days}
                          </span>
                          <span
                            className={`inline-flex rounded-full border border-current/10 px-2 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] ${intensityClasses(day.intensity)}`}
                          >
                            {intensityLabel(day.intensity)}
                          </span>
                        </div>

                        <h4 className="font-serif text-[1.8rem] leading-[1.1] text-[#111111] transition-colors group-hover:text-[#2563EB] md:text-[2.1rem]">
                          {day.title}
                        </h4>

                        <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-[#666666] md:text-[0.96rem]">
                          {day.note}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#111111] transition-all duration-200 group-hover:border-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white">
                        <ArrowRight size={15} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </AnimatedItem>
          );
        })}
      </div>
    </div>
  );
}