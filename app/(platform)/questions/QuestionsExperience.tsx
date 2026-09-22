"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleHelp, FileCheck2, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { getChapters, getCourses, getStudentAssessments } from "@/lib/content/access";
import type { Difficulty, Question } from "@/lib/content/types/question";

const difficulties: Array<Difficulty | "all"> = ["all", "easy", "medium", "hard"];
const questionCounts = [5, 10, 15, 20];

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

  const assessments = useMemo(() => getStudentAssessments(courseId, { preview }), [courseId, preview]);
  const firstChapterId = getChapters(courseId)[0]?.id ?? "complex-numbers";
  const selectedAssessmentChapter = (assessment: ReturnType<typeof getStudentAssessments>[number]) => assessment.blueprint.rules.find((rule) => rule.chapterId)?.chapterId ?? firstChapterId;
  const practiceHref = matchingQuestions.length
    ? `/courses/${courseId}/chapter/${matchingQuestions[0].chapterId}/practice?limit=${count}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}${subtopic ? `&subtopic=${encodeURIComponent(subtopic)}` : ""}${difficulty !== "all" ? `&difficulty=${difficulty}` : ""}${preview ? "&preview=1" : ""}`
    : "#no-matches";

  function changeCourse(value: string) {
    setCourseId(value);
    setTopic("");
    setSubtopic("");
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-10 border-b border-[#E5E5E5] pb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white"><CircleHelp size={18} /></div>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Practice space</span>
          </div>
          <h1 className="font-serif text-5xl tracking-tight text-[#111111] md:text-6xl">Questions</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#666666]">Practice what you have learned and take structured assessments from the same course question bank.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.03)] md:p-8">
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
                <select value={courseId} onChange={(event) => changeCourse(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.code} · {course.title}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Difficulty</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "all")} className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  {difficulties.map((value) => (
                    <option key={value} value={value}>{value === "all" ? "Any difficulty" : value.charAt(0).toUpperCase() + value.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Topic</span>
                <select value={topic} onChange={(event) => { setTopic(event.target.value); setSubtopic(""); }} className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  <option value="">All topics</option>
                  {topics.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="field-label">Subtopic</span>
                <select value={subtopic} onChange={(event) => setSubtopic(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
                  <option value="">All subtopics</option>
                  {subtopics.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="field-label">Number of questions</span>
                <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm outline-none focus:border-[#FFBE00]">
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
                        <div className="font-serif text-xl">{assessment.title}</div>
                        <p className="mt-1 text-sm leading-6 text-white/60">{assessment.description}</p>
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
  );
}
