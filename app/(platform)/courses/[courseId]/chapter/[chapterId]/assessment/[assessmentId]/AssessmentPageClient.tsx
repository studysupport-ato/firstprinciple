"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ChevronLeft, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import katex from "katex";

import type { Question, QuestionOption } from "@/lib/content/types/question";
import {
  createAssessmentSession,
  getCurrentQuestionId,
  setSessionAnswer,
  submitAssessmentSession,
  type AssessmentSession,
} from "@/lib/assessment/session";
import { evaluateAssessmentQuestion } from "@/lib/assessment/evaluation";
import { calculateAssessmentScore } from "@/lib/assessment/scoring";
import { generateAssessmentResult } from "@/lib/assessment/result";
import { getPersistedAssessmentAttempt, recordAssessmentStart, recordAssessmentSubmit } from "@/lib/progress";

function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "my-6 block text-center text-xl" : "inline"}`} />;
}

function renderInlineMath(text: string) {
  return text.split(/(\$.*?\$)/g).map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return <MathText key={index} math={part.slice(1, -1)} />;
    }
    return <span key={index}>{part}</span>;
  });
}

function QuestionRenderer({
  question,
  selectedValue,
  onSelect,
  submitted,
}: {
  question: Question;
  selectedValue: string | number | boolean | string[] | null;
  onSelect: (value: string | number | boolean | string[] | null) => void;
  submitted: boolean;
}) {
  const options = question.options ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">Assessment question</span>
        <h2 className="mt-4 editorial-heading text-2xl md:text-3xl text-[#111111] leading-relaxed">
          {renderInlineMath(question.prompt)}
        </h2>
      </div>

      {question.type === "multiple-choice" && options.length > 0 ? (
        <div className="space-y-3">
          {options.map((option: QuestionOption) => {
            const isSelected = selectedValue === option.id;
            const isCorrect = option.id === question.correctAnswer;
            let stateClass = "border-[#E5E5E5] bg-white hover:border-[#111111]";

            if (submitted) {
              if (isCorrect) stateClass = "border-[#059669] bg-[#ECFDF5]";
              else if (isSelected) stateClass = "border-[#E11D48] bg-[#FEF2F2]";
              else stateClass = "border-[#E5E5E5] bg-white opacity-50";
            } else if (isSelected) {
              stateClass = "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]";
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={submitted}
                className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all ${stateClass}`}
              >
                <span className="font-sans text-base text-[#111111]">
                  <span className="mr-3 font-semibold text-[#666666]">{option.label}</span>
                  {renderInlineMath(option.text)}
                </span>
                {submitted && isCorrect && <CheckCircle2 className="text-[#059669]" size={20} />}
                {submitted && isSelected && !isCorrect && <XCircle className="text-[#E11D48]" size={20} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white px-5 py-4">
          <label className="mb-2 block font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Your answer</label>
          <input
            type={question.type === "numerical" ? "number" : "text"}
            value={selectedValue === null || selectedValue === undefined ? "" : String(selectedValue)}
            onChange={(event) => {
              const nextValue = question.type === "numerical" ? Number(event.target.value) : event.target.value;
              onSelect(nextValue);
            }}
            disabled={submitted}
            placeholder={question.type === "numerical" ? "Enter a number" : "Type your answer"}
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 font-sans text-base text-[#111111] outline-none transition focus:border-[#2563EB]"
          />
        </div>
      )}

      {submitted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5"
        >
          <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">
            {evaluateAssessmentQuestion(question, { questionId: question.id, value: selectedValue, answeredAt: new Date().toISOString() }).isCorrect ? (
              <Check size={14} className="text-[#059669]" />
            ) : (
              <XCircle size={14} className="text-[#E11D48]" />
            )}
            {evaluateAssessmentQuestion(question, { questionId: question.id, value: selectedValue, answeredAt: new Date().toISOString() }).isCorrect ? "Correct" : "Feedback"}
          </div>
          <p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]">
            {renderInlineMath(question.explanation)}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export function AssessmentPageClient({
  initialQuestions,
  courseId,
  chapterId,
  assessmentId,
  preview,
}: {
  initialQuestions: Question[];
  courseId: string;
  chapterId: string;
  assessmentId: string;
  preview?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedValue, setSelectedValue] = useState<string | number | boolean | string[] | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof generateAssessmentResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!initialQuestions.length) {
      setError("The selected assessment could not be found in the student view.");
      setQuestions([]);
      setSession(null);
      return;
    }

    let cancelled = false;

    const hydrateAssessment = async () => {
      setIsLoading(true);
      try {
        const existingAttempt = await getPersistedAssessmentAttempt(assessmentId, courseId);

        if (cancelled) {
          return;
        }

        if (existingAttempt?.status === "submitted") {
          const restoredSession: AssessmentSession = {
            id: existingAttempt.id,
            assessmentId: existingAttempt.assessmentId,
            courseId: existingAttempt.courseId,
            chapterId: existingAttempt.chapterId,
            questionIds: initialQuestions.map((question) => question.id),
            currentIndex: initialQuestions.length - 1,
            answers: Object.fromEntries(Object.entries(existingAttempt.answers).map(([questionId, value]) => [
              questionId,
              {
                questionId,
                value,
                answeredAt: existingAttempt.submittedAt ?? existingAttempt.startedAt,
              },
            ])),
            startedAt: existingAttempt.startedAt,
            submittedAt: existingAttempt.submittedAt ?? null,
            status: "submitted",
          };

          const restoredResult = generateAssessmentResult(restoredSession, initialQuestions, assessmentId, courseId);
          setQuestions(initialQuestions);
          setSession(restoredSession);
          setResult(restoredResult);
          setSelectedValue(null);
          setShowConfirm(false);
          setError(null);
          return;
        }

        const nextSession = createAssessmentSession(assessmentId, courseId, initialQuestions.map((question) => question.id), chapterId);
        setQuestions(initialQuestions);
        setSession(nextSession);
        setSelectedValue(null);
        setShowConfirm(false);
        setResult(null);
        await recordAssessmentStart(courseId, assessmentId, chapterId, nextSession.startedAt);
      } catch (error) {
        console.error("[Assessment] failed to restore or initialize persisted assessment state.", error);
        if (!cancelled) {
          setError("The selected assessment could not be restored. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void hydrateAssessment();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, chapterId, courseId, initialQuestions]);

  const currentQuestion = useMemo(() => {
    if (!session || !questions.length) return null;
    const id = getCurrentQuestionId(session);
    return questions.find((question) => question.id === id) ?? null;
  }, [session, questions]);

  const currentIndex = session ? session.currentIndex + 1 : 0;
  const submitted = !!session && (session.status === "submitted" || session.status === "completed");

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Loading</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Preparing assessment…</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Assessment unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Unable to load assessment.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">{error}</p>
          <Link href={`/courses/${courseId}/roadmap`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            Back to roadmap
          </Link>
        </div>
      </div>
    );
  }

  if (!assessmentId || !session || !currentQuestion || !questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Assessment unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">No assessment was found.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">The selected blueprint did not resolve to a valid assessment in the hosted question bank.</p>
          <Link href={`/courses/${courseId}/roadmap`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            Back to roadmap
          </Link>
        </div>
      </div>
    );
  }

  const scoreSummary = session && questions.length ? calculateAssessmentScore(session, questions) : null;

  const handleAnswerSelect = (value: string | number | boolean | string[] | null) => {
    if (!session || submitted) return;
    setSelectedValue(value);
    setSession((previous) => previous ? setSessionAnswer(previous, currentQuestion.id, value) : previous);
  };

  const handleNext = () => {
    if (!session) return;
    if (session.currentIndex >= session.questionIds.length - 1) return;

    const nextIndex = session.currentIndex + 1;
    const nextQuestionId = session.questionIds[nextIndex];
    setSession((previous) => (previous ? { ...previous, currentIndex: nextIndex } : previous));
    setSelectedValue(session.answers[nextQuestionId]?.value ?? null);
  };

  const handlePrevious = () => {
    if (!session || session.currentIndex === 0) return;

    const previousIndex = session.currentIndex - 1;
    const previousQuestionId = session.questionIds[previousIndex];
    setSession((previous) => (previous ? { ...previous, currentIndex: previousIndex } : previous));
    setSelectedValue(session.answers[previousQuestionId]?.value ?? null);
  };

  const handleSubmit = async () => {
    if (!session) return;

    try {
      const finished = submitAssessmentSession(session);
      setSession(finished);
      const result = generateAssessmentResult(finished, questions, assessmentId, courseId);
      setResult(result);

      await recordAssessmentSubmit({
        assessmentId,
        courseId,
        chapterId,
        startedAt: session.startedAt,
        answers: Object.fromEntries(Object.entries(session.answers).map(([id, record]) => [id, record.value])),
        score: result.earnedMarks,
        percentage: result.percentage,
        marksEarned: result.earnedMarks,
        marksAvailable: result.possibleMarks,
      });
    } catch (error) {
      console.error("[Assessment] failed to persist attempt.", error);
      setError("Your assessment was evaluated, but it could not be saved. Please try again.");
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] p-6 md:p-10">
        <div className="mx-auto max-w-5xl rounded-[30px] border border-[#E5E5E5] bg-white p-6 shadow-sm md:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Assessment complete</p>
              <h1 className="mt-2 editorial-heading text-4xl text-[#111111]">Results</h1>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F7F8]">
              <Trophy className="text-[#2563EB]" size={28} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.2fr_2fr]">
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-6">
              <div className="flex items-end justify-center gap-2">
                <span className="font-sans text-6xl font-black text-[#111111]">{result.percentage}</span>
                <span className="mb-2 font-sans text-xl text-[#666666]">%</span>
              </div>
              <p className="mt-3 text-center font-sans text-sm text-[#666666]">{result.earnedMarks} / {result.possibleMarks} marks</p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white p-3">
                  <div className="font-sans text-2xl font-black text-[#111111]">{result.correctAnswers}</div>
                  <div className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#666666]">Correct</div>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <div className="font-sans text-2xl font-black text-[#111111]">{result.incorrectAnswers}</div>
                  <div className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#666666]">Incorrect</div>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <div className="font-sans text-2xl font-black text-[#111111]">{result.answeredQuestions}</div>
                  <div className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#666666]">Answered</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {result.questionResults.map((item, index) => {
                const question = questions.find((entry) => entry.id === item.questionId);
                if (!question) return null;

                return (
                  <div key={item.questionId} className="rounded-2xl border border-[#E5E5E5] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Question {index + 1}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.2em] ${item.isCorrect ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#E11D48]"}`}>
                        {item.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <p className="font-sans text-sm text-[#111111]">{renderInlineMath(question.prompt)}</p>
                    <div className="mt-3 grid gap-2 text-sm text-[#666666]">
                      <div className="rounded-xl bg-[#F7F7F8] p-3">
                        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Your answer</span>
                        <div className="mt-1 font-sans text-[#111111]">{item.studentAnswer === null ? "No answer" : String(item.studentAnswer)}</div>
                      </div>
                      <div className="rounded-xl bg-[#F7F7F8] p-3">
                        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Correct answer</span>
                        <div className="mt-1 font-sans text-[#111111]">{String(item.correctAnswer)}</div>
                      </div>
                    </div>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]">{renderInlineMath(item.explanation)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-5xl justify-end">
          <Link
            href={`/courses/${courseId}/roadmap`}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#FFBE00] hover:text-[#111111]"
          >
            Return to Roadmap
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const currentAnswerValue = session.answers[currentQuestion.id]?.value ?? selectedValue;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F8]">
      <header className="flex h-16 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 md:px-8">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}/roadmap`} className="text-[#666666] transition-colors hover:text-[#111111]">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">{chapterId}</span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#111111]">Assessment</span>
          </div>
        </div>
        <div className="hidden w-64 items-center gap-3 md:flex">
          <span className="font-sans text-xs font-semibold text-[#666666]">{currentIndex} / {questions.length}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
            <div className="h-full rounded-full bg-[#111111] transition-all duration-300" style={{ width: `${(currentIndex / questions.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-5xl rounded-[30px] border border-[#E5E5E5] bg-white p-6 shadow-sm md:p-10">
          <QuestionRenderer
            question={currentQuestion}
            selectedValue={currentAnswerValue}
            onSelect={handleAnswerSelect}
            submitted={submitted}
          />

          <div className="mt-8 grid gap-4 border-t border-[#E5E5E5] pt-6 md:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {questions.map((question, index) => {
                const current = question.id === currentQuestion.id;
                const answered = Boolean(session.answers[question.id]);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      if (!session) return;
                      const targetIndex = session.questionIds.indexOf(question.id);
                      if (targetIndex >= 0) {
                        setSession((previous) => previous ? { ...previous, currentIndex: targetIndex } : previous);
                        setSelectedValue(session.answers[question.id]?.value ?? null);
                      }
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold transition ${current ? "border-[#111111] bg-[#111111] text-white" : answered ? "border-[#059669] bg-[#ECFDF5] text-[#059669]" : "border-[#E5E5E5] bg-white text-[#666666]"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={session.currentIndex === 0}
                className="rounded-full border border-[#E5E5E5] px-5 py-3 font-sans text-sm font-semibold text-[#666666] transition hover:border-[#111111] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => (session.currentIndex === questions.length - 1 ? setShowConfirm(true) : handleNext())}
                  className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-7 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]"
                >
                  {session.currentIndex === questions.length - 1 ? "Submit" : "Next"} <ArrowRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded-full border border-[#E5E5E5] px-5 py-3 font-sans text-sm font-semibold text-[#666666]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]"
                  >
                    Confirm submit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
