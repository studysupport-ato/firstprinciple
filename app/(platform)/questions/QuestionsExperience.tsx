"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import type { QuestionDirectorySummary } from "@/lib/questions/repository";
import { getTopicBank, type TopicBank } from "@/lib/questions/topicBanks";
import type { Course } from "@/lib/content/types/course";

// ── Year definitions ─────────────────────────────────────────────────────────
const YEARS = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Fourth year" },
] as const;

type YearValue = 1 | 2 | 3 | 4;

// ── Helpers ──────────────────────────────────────────────────────────────────
function coursesForYear(courses: Course[], year: YearValue) {
  // Courses don't carry a year field directly; infer from course code number
  // (e.g. MATH 151 → year 1, MATH 251 → year 2). Fall back to all if unknown.
  return courses.filter((c) => {
    const match = c.code?.match(/(\d)/);
    if (!match) return true;
    return parseInt(match[1], 10) === year;
  });
}

function questionsForCourses(questions: QuestionDirectorySummary[], courseIds: Set<string>) {
  return questions.filter((q) => courseIds.has(q.courseId));
}

function yearOfCourse(course: Course | undefined): YearValue | null {
  const match = course?.code?.match(/(\d)/);
  const year = match ? parseInt(match[1], 10) : NaN;
  return year >= 1 && year <= 4 ? (year as YearValue) : null;
}

export default function QuestionsExperience({
  initialQuestions,
  courses,
  preview,
  initialCourseId,
}: {
  initialQuestions: QuestionDirectorySummary[];
  courses: Course[];
  preview: boolean;
  /** Opens a question-bank course's topic tiles directly (?course=…). */
  initialCourseId?: string;
}) {
  const initialCourse = initialCourseId && getTopicBank(initialCourseId) ? courses.find((course) => course.id === initialCourseId) : undefined;
  const [selectedYear, setSelectedYear] = useState<YearValue | null>(initialCourse ? yearOfCourse(initialCourse) : null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourse?.id ?? null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Pre-compute stats per year
  const yearStats = useMemo(() =>
    YEARS.map(({ value, label }) => {
      const yearCourses = coursesForYear(courses, value);
      const courseIds = new Set(yearCourses.map((c) => c.id));
      const questionCount = questionsForCourses(initialQuestions, courseIds).length;
      return { value, label, courseCount: yearCourses.length, questionCount, courses: yearCourses };
    }),
  [courses, initialQuestions]);

  // A question-bank course is selected: show its topic tiles.
  const selectedCourse = selectedCourseId ? courses.find((course) => course.id === selectedCourseId) : undefined;
  const selectedBank = selectedCourse ? getTopicBank(selectedCourse.id) : undefined;
  if (selectedCourse && selectedBank) {
    return (
      <TopicBankView
        course={selectedCourse}
        bank={selectedBank}
        questions={initialQuestions.filter((question) => question.courseId === selectedCourse.id)}
        preview={preview}
        backLabel={YEARS.find((year) => year.value === (selectedYear ?? yearOfCourse(selectedCourse)))?.label ?? "Practice questions"}
        group={selectedGroup}
        onSelectGroup={setSelectedGroup}
        onBack={() => {
          if (selectedGroup) {
            setSelectedGroup(null);
            return;
          }
          setSelectedCourseId(null);
          setSelectedYear((year) => year ?? yearOfCourse(selectedCourse));
        }}
      />
    );
  }

  // If a year is selected, show its courses
  if (selectedYear !== null) {
    const year = yearStats.find((y) => y.value === selectedYear)!;
    const yearCourses = year.courses;
    const courseIds = new Set(yearCourses.map((c) => c.id));

    return (
      <div
        className="relative min-h-screen overflow-x-clip pb-16"
        style={{ background: "var(--gold-sweep)" }}
      >
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Building image */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-[position:62%_center] opacity-25 grayscale mix-blend-multiply"
          style={{ backgroundImage: "url('/last.jpeg')" }}
        />

        <div className="relative z-10 px-[40px] pt-[40px] max-[900px]:px-[18px]">
          <div className="mx-auto max-w-[1220px]">
            <button
              onClick={() => setSelectedYear(null)}
              className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#1A1814]/80 transition hover:text-[#1A1814]"
            >
              ← Practice questions
            </button>

            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/70">
              Question Bank
            </p>
            <h1 className="font-sans text-[clamp(3.5rem,8vw,5.5rem)] font-black leading-[1.0] tracking-[-0.03em] text-[#1A1814]">
              {year.label}
            </h1>
            <p className="mt-3 text-[20px] font-medium text-[#1A1814]/80">
              Choose a course to practise.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {yearCourses.length === 0 ? (
                <div className="col-span-2 rounded-[24px] bg-[#1A1814]/10 p-10 text-center font-bold text-[#1A1814]/60">
                  No courses available for this year yet.
                </div>
              ) : (
                yearCourses.map((course) => {
                  const qCount = initialQuestions.filter((q) => q.courseId === course.id).length;
                  const bank = getTopicBank(course.id);
                  if (bank) {
                    const topicCount = bank.topics.filter((topic) => initialQuestions.some((q) => q.courseId === course.id && q.topic === topic)).length;
                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedCourseId(course.id)}
                        className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:px-7 md:py-6"
                      >
                        <CourseCardBody code={course.code} title={course.title} meta={`${topicCount} topics · ${qCount} questions`} />
                        <ArrowBadge />
                      </button>
                    );
                  }
                  const firstChapterId = initialQuestions.find((q) => q.courseId === course.id)?.chapterId ?? "";
                  const href = firstChapterId
                    ? `/courses/${course.id}/chapter/${firstChapterId}/practice?limit=10${preview ? "&preview=1" : ""}`
                    : "#";

                  return (
                    <Link
                      key={course.id}
                      href={href}
                      className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:px-7 md:py-6"
                    >
                      <div className="flex items-center gap-5">
                        <span className="flex h-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#E9BC3A] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
                          {course.code}
                        </span>
                        <div>
                          <div className="font-sans text-[22px] font-black leading-[1.1] text-[#F6EFDC] md:text-[24px]">
                            {course.title}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/60">
                            {course.chapterIds?.length || 0} lessons · {qCount} questions
                          </div>
                        </div>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                        <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main year-selection view ──────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "var(--gold-sweep)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Building image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-[position:62%_center] opacity-25 grayscale mix-blend-multiply"
        style={{ backgroundImage: "url('/last.jpeg')" }}
      />

      <div className="relative z-10 px-[40px] pt-[40px] max-[900px]:px-[18px]">
        <div className="mx-auto max-w-[1220px]">
          {/* Header */}
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/60">
            Question Bank
          </p>
          <h1 className="font-sans text-[clamp(2.8rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.025em] text-[#1A1814]">
            Practice questions
          </h1>
          <p className="mt-3 text-[18px] font-medium text-[#26231C]/75">
            Choose your year, then a course.
          </p>

          {/* Year cards grid */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {yearStats.map(({ value, label, courseCount, questionCount }) => (
              <button
                key={value}
                onClick={() => setSelectedYear(value)}
                className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:p-7"
              >
                <div>
                  <div className="font-sans text-[22px] font-black text-[#F6EFDC] md:text-[24px]">
                    {label}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/55">
                    {courseCount} courses · {questionCount} questions
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                  <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// ── Shared pieces ────────────────────────────────────────────────────────────
function GoldBackdrop({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "linear-gradient(135deg, #f0c84a 0%, #E9BC3A 45%, #d4a82e 100%)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Building image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-[position:62%_center] opacity-25 grayscale mix-blend-multiply"
        style={{ backgroundImage: "url('/last.jpeg')" }}
      />
      <div className="relative z-10 px-[40px] pt-[40px] max-[900px]:px-[18px]">
        <div className="mx-auto max-w-[1220px]">{children}</div>
      </div>
    </div>
  );
}

function CourseCardBody({ code, title, meta }: { code: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-5">
      <span className="flex h-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#E9BC3A] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
        {code}
      </span>
      <div>
        <div className="font-sans text-[22px] font-black leading-[1.1] text-[#F6EFDC] md:text-[24px]">{title}</div>
        <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/60">{meta}</div>
      </div>
    </div>
  );
}

function ArrowBadge() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
      <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
    </div>
  );
}

function practiceHref(courseId: string, bank: TopicBank, topic: string, subtopic: string | null, preview: boolean) {
  const params = new URLSearchParams({ topic, limit: "1000" });
  if (subtopic) params.set("subtopic", subtopic);
  if (preview) params.set("preview", "1");
  return `/courses/${courseId}/chapter/${bank.chapterId}/practice?${params.toString()}`;
}

// ── Topic tiles for a question-bank course (e.g. ENGL 157) ───────────────────
function TopicBankView({
  course,
  bank,
  questions,
  preview,
  backLabel,
  group,
  onSelectGroup,
  onBack,
}: {
  course: Course;
  bank: TopicBank;
  questions: QuestionDirectorySummary[];
  preview: boolean;
  backLabel: string;
  group: string | null;
  onSelectGroup: (topic: string | null) => void;
  onBack: () => void;
}) {
  const inBank = questions.filter((question) => question.chapterId === bank.chapterId);
  const countFor = (topic: string, subtopic?: string) =>
    inBank.filter((question) => question.topic === topic && (subtopic === undefined || question.subtopic === subtopic)).length;

  // Sub-tiles of a grouped topic (the "Uncertain" questions keep their
  // original topic as a sub-heading).
  if (group) {
    const listed = bank.subtopics?.[group] ?? [];
    const ordered = [...listed, ...bank.topics, ...inBank.map((question) => question.subtopic)];
    const subtopics = ordered.filter((subtopic, index) => ordered.indexOf(subtopic) === index && countFor(group, subtopic) > 0);
    const numberOf = (subtopic: string) => {
      if (listed.length) return subtopics.indexOf(subtopic) + 1;
      return bank.topics.indexOf(subtopic) >= 0 ? bank.topics.indexOf(subtopic) + 1 : null;
    };
    return (
      <GoldBackdrop>
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#1A1814]/80 transition hover:text-[#1A1814]">
          ← {course.code} topics
        </button>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/70">
          {course.code} · {course.title}
        </p>
        <h1 className="font-sans text-[clamp(3rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.03em] text-[#1A1814]">{group}</h1>
        <p className="mt-3 text-[18px] font-medium text-[#26231C]/80">
          {group === bank.groupedTopic && bank.groupedTopicNote ? `${bank.groupedTopicNote}. ` : ""}{plural(countFor(group), "question")}, grouped by {listed.length ? "subtopic" : "topic"}.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TopicTile number={null} title={`All ${group.toLowerCase()} questions`} meta={plural(countFor(group), "question")} href={practiceHref(course.id, bank, group, null, preview)} />
          {subtopics.map((subtopic) => (
            <TopicTile
              key={subtopic}
              number={numberOf(subtopic)}
              title={subtopic}
              meta={plural(countFor(group, subtopic), "question")}
              href={practiceHref(course.id, bank, group, subtopic, preview)}
            />
          ))}
        </div>
      </GoldBackdrop>
    );
  }

  const topicTotal = bank.topics.filter((topic) => countFor(topic) > 0).length;

  return (
    <GoldBackdrop>
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#1A1814]/80 transition hover:text-[#1A1814]">
        ← {backLabel}
      </button>
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/70">
        Question Bank · {course.code}
      </p>
      <h1 className="font-sans text-[clamp(3rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.03em] text-[#1A1814]">{course.title}</h1>
      <p className="mt-3 text-[18px] font-medium text-[#26231C]/80">
        {topicTotal} topics · {inBank.length} questions. Choose a topic to practise.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bank.topics.map((topic, index) => {
          const count = countFor(topic);
          const isGroupedTopic = topic === bank.groupedTopic;
          const grouped = isGroupedTopic || Boolean(bank.subtopics?.[topic]?.length);
          return (
            <TopicTile
              key={topic}
              number={index + 1}
              title={topic}
              meta={count ? plural(count, "question") : "No questions yet"}
              note={isGroupedTopic ? bank.groupedTopicNote : undefined}
              dashed={isGroupedTopic}
              disabled={!count}
              href={grouped ? undefined : practiceHref(course.id, bank, topic, null, preview)}
              onClick={grouped ? () => onSelectGroup(topic) : undefined}
            />
          );
        })}
      </div>
    </GoldBackdrop>
  );
}

function TopicTile({
  number,
  title,
  meta,
  note,
  dashed,
  disabled,
  href,
  onClick,
}: {
  number: number | null;
  title: string;
  meta: string;
  note?: string;
  dashed?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = `group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 md:px-7 md:py-6 ${
    dashed ? "outline-dashed outline-2 outline-offset-[-6px] outline-[#E9BC3A]/70" : ""
  } ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-1"}`;
  const body = (
    <>
      <div className="flex items-center gap-4">
        {number !== null ? (
          <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-[#E9BC3A] text-[13px] font-black text-[#1A1814]">
            {number}
          </span>
        ) : null}
        <div>
          <div className="font-sans text-[19px] font-black leading-[1.15] text-[#F6EFDC] md:text-[20px]">{title}</div>
          {note ? <div className="mt-1 text-[12px] font-medium text-[#E9BC3A]">{note}</div> : null}
          <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/60">{meta}</div>
        </div>
      </div>
      {!disabled ? <ArrowBadge /> : null}
    </>
  );

  if (disabled) return <div className={className} aria-disabled="true">{body}</div>;
  if (href) return <Link href={href} className={className}>{body}</Link>;
  return <button type="button" onClick={onClick} className={className}>{body}</button>;
}
