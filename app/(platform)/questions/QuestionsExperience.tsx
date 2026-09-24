"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  Layers,
  ListChecks,
  Play,
  Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { EducationalText } from "@/components/learning/EducationalText";
import { AnimatedItem } from "@/components/motion/AnimatedItem";

import { getChapters, getCourses, getStudentAssessments } from "@/lib/content/access";
import type { Difficulty, Question } from "@/lib/content/types/question";

const difficulties: Array<Difficulty | "all"> = ["all", "easy", "medium", "hard"];
const questionCounts = [5, 10, 15, 20];

// Difficulty accents reuse the dashboard palette so every platform page reads as one system.
const difficultyMeta: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#059669" },
  medium: { label: "Medium", color: "#E5A600" },
  hard: { label: "Hard", color: "#E11D48" },
};

// Pill styling shared by the difficulty and set-size controls (matches the material filters).
function pillClass(active: boolean) {
  return `inline-flex items-center gap-[8px] rounded-full px-[14px] py-[8px] text-[12px] font-bold transition ${
    active ? "bg-[#0e0e0e] text-[#FFC700]" : "border-[1.2px] border-black/50 text-[#0e0e0e] hover:bg-black/5"
  }`;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="relative mt-[9px] block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[12px] border border-[#111111]/15 bg-white/70 px-[15px] py-[12px] pr-[40px] text-[13.5px] font-semibold text-[#111111] outline-none transition hover:border-[#111111]/30 focus:border-[#111111]/45 focus:bg-white"
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2.6}
          className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-[#111111]/45"
        />
      </span>
    </label>
  );
}

export default function QuestionsExperience({
  initialQuestions,
  initialCourseId,
  preview,
}: {
  initialQuestions: Question[];
  initialCourseId: string;
  preview: boolean;
}) {
  const courses = useMemo(() => getCourses(), []);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [count, setCount] = useState(5);

  const availableQuestions = initialQuestions.filter((question) => question.courseId === courseId);
  const topics = useMemo(() => [...new Set(availableQuestions.map((question) => question.topic))].sort(), [availableQuestions]);
  const subtopics = useMemo(
    () => [...new Set(availableQuestions.filter((question) => !topic || question.topic === topic).map((question) => question.subtopic))].sort(),
    [availableQuestions, topic],
  );
  const matchingQuestions = useMemo(
    () =>
      availableQuestions.filter((question) => {
        if (topic && question.topic !== topic) return false;
        if (subtopic && question.subtopic !== subtopic) return false;
        if (difficulty !== "all" && question.difficulty !== difficulty) return false;
        return true;
      }),
    [availableQuestions, difficulty, subtopic, topic],
  );
  const difficultyBreakdown = useMemo(
    () =>
      (["easy", "medium", "hard"] as Difficulty[]).map((level) => ({
        level,
        ...difficultyMeta[level],
        count: matchingQuestions.filter((question) => question.difficulty === level).length,
      })),
    [matchingQuestions],
  );

  const assessments = useMemo(() => getStudentAssessments(courseId, { preview }), [courseId, preview]);
  const firstChapterId = getChapters(courseId)[0]?.id ?? "complex-numbers";
  const selectedAssessmentChapter = (assessment: ReturnType<typeof getStudentAssessments>[number]) => assessment.blueprint.rules.find((rule) => rule.chapterId)?.chapterId ?? firstChapterId;
  const practiceHref = matchingQuestions.length
    ? `/courses/${courseId}/chapter/${matchingQuestions[0].chapterId}/practice?limit=${count}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}${subtopic ? `&subtopic=${encodeURIComponent(subtopic)}` : ""}${difficulty !== "all" ? `&difficulty=${difficulty}` : ""}${preview ? "&preview=1" : ""}`
    : "#no-matches";

  const selectedCourse = courses.find((course) => course.id === courseId);
  const stats = [
    { label: "Matching questions", value: matchingQuestions.length, icon: ListChecks, color: "#E5A600" },
    { label: "Topics in scope", value: topics.length, icon: Layers, color: "#6673ff" },
    { label: "Course checkpoints", value: assessments.length, icon: FileCheck2, color: "#059669" },
  ];

  function changeCourse(value: string) {
    setCourseId(value);
    setTopic("");
    setSubtopic("");
  }

  function clearQuestionFilters() {
    setTopic("");
    setSubtopic("");
    setDifficulty("all");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <section className="relative isolate overflow-hidden bg-[#FFC700] px-5 pb-16 pt-8 md:px-10 md:pb-20 md:pt-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-20 w-full md:w-[58%]">
          <div className="absolute inset-0 bg-[#FFC700] mix-blend-multiply md:left-[-34%]" />
          <div
            className="absolute inset-0 bg-[url('/last.jpeg')] bg-cover bg-[position:62%_center] opacity-80 grayscale mix-blend-multiply"
            style={{
              maskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
        </div>
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full border-[55px] border-black/[0.06]" />

        <AnimatedItem className="relative mx-auto max-w-[1180px]">
          <div className="mb-8 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-black/60">
            <CircleHelp size={15} strokeWidth={2.4} />
            <span>Learning space</span>
            <span className="text-[8px]">●</span>
            <span className="text-black/80">Questions</span>
          </div>

          <div className="grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="max-w-[650px]">
              <p className="mb-2 font-sans text-[15px] text-[#1d1d1d]">Ready when you are,</p>
              <h1 className="font-sans text-[46px] font-black leading-[0.98] tracking-[-0.035em] text-[#0c0c0c] md:text-[64px]">
                PRACTICE.<br />PROVE IT.
              </h1>
              <p className="mt-5 max-w-[540px] text-[13.5px] leading-[1.6] text-black/65">
                Turn what you have learned into mastery with focused question sets and clear course checkpoints.
              </p>
              {selectedCourse ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/20 bg-black/[0.07] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-black/70">
                  <BookOpenCheck size={14} /> {selectedCourse.code} · {selectedCourse.title}
                </div>
              ) : null}
            </div>

            <div className="rounded-[20px] bg-[#0c0c0c] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">Question bank</div>
              <div className="mt-2 text-[30px] font-black leading-none">{availableQuestions.length}</div>
              <div className="mt-1 text-[12px] text-white/55">questions ready for {selectedCourse?.code ?? "this course"}</div>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-[#FFC700]">
                <ListChecks size={14} /> {matchingQuestions.length} match your filters
              </div>
            </div>
          </div>
        </AnimatedItem>
      </section>

      <div className="px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">Build your session</div>
              <h2 className="mt-1 font-sans text-[30px] font-black tracking-[-0.025em] text-[#111111]">Choose what to practice</h2>
            </div>
            {matchingQuestions.length > 0 ? (
              <button type="button" onClick={clearQuestionFilters} className="w-fit rounded-full border border-black/20 bg-white/60 px-4 py-2 text-[11px] font-bold text-black/65 transition hover:bg-white">
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[24px] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#111111]">Practice questions</div>
                <h2 className="mt-2 font-serif text-3xl text-[#111111]">Build a focused set</h2>
              </div>
              <BookOpenCheck size={22} className="text-[#111111]" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="field-label">Course</span>
                <select value={courseId} onChange={(event) => changeCourse(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.code} · {course.title}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Difficulty</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "all")} className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  {difficulties.map((value) => (
                    <option key={value} value={value}>{value === "all" ? "Any difficulty" : value.charAt(0).toUpperCase() + value.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Topic</span>
                <select value={topic} onChange={(event) => { setTopic(event.target.value); setSubtopic(""); }} className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  <option value="">All topics</option>
                  {topics.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Subtopic</span>
                <select value={subtopic} onChange={(event) => setSubtopic(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  <option value="">All subtopics</option>
                  {subtopics.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="field-label">Number of questions</span>
                <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  {questionCounts.map((value) => <option key={value} value={value}>{value} questions</option>)}
                </select>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-[#E5E5E5] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-[#666666]">{matchingQuestions.length ? `${Math.min(count, matchingQuestions.length)} of ${matchingQuestions.length} matching questions available` : "No available questions match these filters."}</span>
              <Link href={practiceHref} aria-disabled={!matchingQuestions.length} onClick={(event) => { if (!matchingQuestions.length) event.preventDefault(); }} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FFBE00] hover:text-[#111111] aria-disabled:pointer-events-none aria-disabled:opacity-40">
                <Play size={15} fill="currentColor" /> Start practice
              </Link>
            </div>

            {!matchingQuestions.length ? (
              <p id="no-matches" className="mt-4 rounded-2xl border border-dashed border-[#E5E5E5] bg-transparent p-4 text-sm text-[#666666]">Try a broader topic, subtopic, or difficulty selection.</p>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-[#E5E5E5] bg-[#111111] p-6 text-white shadow-[0_16px_36px_rgba(17,17,17,0.12)] md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Assessments</div>
                <h2 className="mt-2 font-serif text-3xl">Course checkpoints</h2>
              </div>
              <FileCheck2 size={22} className="text-[#9CC3FF]" />
            </div>

            {assessments.length ? (
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <Link key={assessment.id} href={`/courses/${courseId}/chapter/${selectedAssessmentChapter(assessment)}/assessment/${assessment.id}`} className="group block rounded-2xl border border-white/15 bg-white/5 p-4 transition hover:border-white/40 hover:bg-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-serif text-xl"><EducationalText text={assessment.title} /></div>
                        <p className="mt-1 text-sm leading-6 text-white/60"><EducationalText text={assessment.description} /></p>
                      </div>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-white/50 transition group-hover:translate-x-1" />
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      <span>{assessment.questionCount} questions</span>
                      <span>·</span>
                      <span>{assessment.durationMinutes} min</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm leading-6 text-white/65">No assessments are available for this course yet.</div>
            )}
          </section>
        </div>

        {!courses.length ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-6 text-sm text-[#666666]">No courses are available in the question bank yet.</div>
        ) : null}

        <div className="mt-8 flex items-center gap-2 text-xs text-[#777777]">
          <Search size={14} /> Practice and assessments use the canonical Question Bank and existing progress tracking.
        </div>
        </div>
      </div>
    </div>
  );
}
