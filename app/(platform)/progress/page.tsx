"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Target, Flame, Clock, Trophy, ChevronRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getActiveStudentId } from "@/lib/auth/mock";
import { createProgressFactsRepository, type ActivityEvent, type AssessmentAttempt, type PracticeAttempt, type PracticeStats } from "@/lib/progress";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function localDateKey(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPracticeStats(attempts: PracticeAttempt[]): PracticeStats {
  const correctAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
  const distinctCorrect = new Set(attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.questionId)).size;
  return {
    totalAttempts: attempts.length,
    correctAttempts,
    distinctAnswered: new Set(attempts.map((attempt) => attempt.questionId)).size,
    distinctCorrect,
    accuracy: attempts.length ? clampPercent((correctAttempts / attempts.length) * 100) : 0,
    problemsSolved: distinctCorrect,
  };
}

function getAssessmentSummaries(attempts: AssessmentAttempt[]) {
  return attempts
    .filter((attempt) => attempt.status === "submitted")
    .sort((a, b) => (b.submittedAt ?? b.startedAt).localeCompare(a.submittedAt ?? a.startedAt))
    .map((attempt) => ({
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      title: attempt.assessmentId,
      date: attempt.submittedAt ?? attempt.startedAt,
      score: attempt.percentage,
      total: Object.keys(attempt.answers ?? {}).length,
      marksEarned: attempt.marksEarned,
      marksAvailable: attempt.marksAvailable,
    }));
}

function getTopicProgress(attempts: PracticeAttempt[]) {
  const buckets = new Map<string, { topicId: string; topic: string; attempted: number; correct: number }>();
  for (const attempt of attempts) {
    const questionId = attempt.questionId;
    const topic = questionId || "Other";
    const key = topic;
    const entry = buckets.get(key) ?? { topicId: key, topic, attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (attempt.isCorrect) entry.correct += 1;
    buckets.set(key, entry);
  }

  return [...buckets.values()].map((row) => ({
    name: row.topic,
    attempted: row.attempted,
    correct: row.correct,
    accuracy: row.attempted ? clampPercent((row.correct / row.attempted) * 100) : 0,
    mastery: row.attempted ? clampPercent((row.correct / row.attempted) * 100) : 0,
  }));
}

function getOverallMastery(practiceAttempts: PracticeAttempt[], assessmentAttempts: AssessmentAttempt[]) {
  const stats = getPracticeStats(practiceAttempts);
  const parts: number[] = [];
  if (stats.totalAttempts > 0) parts.push(stats.accuracy);
  const submitted = assessmentAttempts.filter((attempt) => attempt.status === "submitted");
  if (submitted.length > 0) {
    const avg = submitted.reduce((sum, attempt) => sum + attempt.percentage, 0) / submitted.length;
    parts.push(avg);
  }
  return parts.length > 0 ? clampPercent(parts.reduce((sum, value) => sum + value, 0) / parts.length) : 0;
}

function getCurrentStreak(events: ActivityEvent[]) {
  const dates = [...new Set(events.map((event) => localDateKey(event.occurredAt)))].sort();
  if (!dates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today.toISOString());
  const lastActiveKey = dates[dates.length - 1];
  const diffCalendarDays = (earlier: string, later: string) => {
    const a = new Date(earlier);
    const b = new Date(later);
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  };

  const distanceFromToday = diffCalendarDays(lastActiveKey, todayKey);
  if (distanceFromToday > 1) return 0;

  let streak = 1;
  for (let index = dates.length - 1; index > 0; index -= 1) {
    if (diffCalendarDays(dates[index - 1], dates[index]) === 1) streak += 1;
    else break;
  }
  return streak;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function ProgressPage() {
  const [ready, setReady] = useState(false);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [mastery, setMastery] = useState(0);
  const [streak, setStreak] = useState(0);
  const [practice, setPractice] = useState<PracticeStats>({ totalAttempts: 0, correctAttempts: 0, distinctAnswered: 0, distinctCorrect: 0, accuracy: 0, problemsSolved: 0 });
  const [topics, setTopics] = useState<ReturnType<typeof getTopicProgress>>([]);
  const [assessments, setAssessments] = useState<ReturnType<typeof getAssessmentSummaries>>([]);

  useEffect(() => {
    let active = true;
    const repository = createProgressFactsRepository("local");

    void (async () => {
      try {
        const studentId = getActiveStudentId();
        const [practiceAttempts, assessmentAttempts, activityResult] = await Promise.all([
          repository.listPracticeAttempts(studentId, { courseId: "math-151" }),
          repository.listAssessmentAttempts(studentId, { courseId: "math-151" }),
          repository.listActivity(studentId, { courseId: "math-151", limit: 50 }),
        ]);

        if (!active) return;

        setActivityEvents(activityResult.events);
        setMastery(getOverallMastery(practiceAttempts, assessmentAttempts));
        setStreak(getCurrentStreak(activityResult.events));
        setPractice(getPracticeStats(practiceAttempts));
        setTopics(getTopicProgress(practiceAttempts));
        setAssessments(getAssessmentSummaries(assessmentAttempts));
        setReady(true);
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to hydrate performance data from Supabase", error);
        if (active) {
          setActivityEvents([]);
          setMastery(0);
          setStreak(0);
          setPractice({ totalAttempts: 0, correctAttempts: 0, distinctAnswered: 0, distinctCorrect: 0, accuracy: 0, problemsSolved: 0 });
          setTopics([]);
          setAssessments([]);
          setReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: "Overall Accuracy", value: practice.totalAttempts > 0 ? `${practice.accuracy}%` : "—", sub: practice.totalAttempts > 0 ? `${practice.correctAttempts} of ${practice.totalAttempts} correct` : "Not enough data yet", icon: Target, tint: "bg-[#FFF8E5] text-[#FFBE00]" },
    { label: "Current Streak", value: `${streak} Days`, sub: streak > 0 ? "Consecutive learning days" : "No streak yet", icon: Flame, tint: "bg-[#FEE7EC] text-[#E11D48]" },
    { label: "Overall Mastery", value: `${mastery}%`, sub: practice.totalAttempts > 0 ? "From practice evidence" : "Not enough data yet", icon: Clock, tint: "bg-[#EAF8F2] text-[#059669]" },
  ];

  const heatmapData = useMemo(() => {
    const counts = new Map<string, number>();
    if (ready) {
      for (const event of activityEvents) {
        const key = event.occurredAt.slice(0, 10);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells: string[] = [];
    for (let offset = 111; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      cells.push(key);
    }
    const weeks: number[][] = [];
    for (let w = 0; w < 16; w += 1) {
      weeks.push(cells.slice(w * 7, w * 7 + 7).map((key) => Math.min(3, counts.get(key) ?? 0)));
    }
    return weeks;
  }, [ready, activityEvents]);

const topicColors = ["bg-[#111111]", "bg-[#FFBE00]", "bg-[#E11D48]", "bg-[#D97706]"];
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-8 md:px-10 md:py-12">
      <header className="pt-2">
        <h1 className="mb-4 font-serif text-4xl tracking-tight text-[#111111] md:text-6xl">
          Performance Analytics
        </h1>
        <p className="max-w-3xl font-sans text-lg leading-relaxed text-[#666666]">
          Track your compounding understanding across MATH 151. Mastery is built day by day.
        </p>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-10"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="flex items-start gap-4 rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_12px_30px_rgba(17,17,17,0.02)]"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tint}`}>
                <stat.icon size={22} />
              </div>
              <div>
                <span className="mb-1 block font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666666]">
                  {stat.label}
                </span>
                <span className="block font-sans text-3xl font-bold text-[#111111]">{stat.value}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <motion.section variants={itemVariants} className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.02)] md:p-7">
            <div className="mb-7 flex items-center justify-between">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#111111]">
                Curriculum Mastery
              </h2>
            </div>

            <div className="space-y-6">
              {topics.length === 0 ? (
                <p className="rounded-[18px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-6 text-center font-sans text-sm text-[#666666]">
                  Not enough data yet. Answer practice questions to build topic mastery.
                </p>
              ) : topics.map((topic, index) => (
                <div key={topic.name} className="group">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="font-sans text-[15px] font-medium text-[#111111]">{topic.name}</span>
                    <span className="font-sans text-xs font-semibold text-[#666666]">{topic.mastery}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.mastery}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 + index * 0.1 }}
                      className={`h-full rounded-full ${topicColors[index % topicColors.length]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.02)] md:p-7">
            <div className="mb-7 flex items-center justify-between">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#111111]">
                Study Consistency
              </h2>
            </div>

            <div className="rounded-[22px] border border-[#E5E5E5] bg-[#FAFAFA] p-4 md:p-5">
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {heatmapData.map((week, wIdx) => (
                  <div key={wIdx} className="flex shrink-0 flex-col gap-2">
                    {week.map((intensity, dIdx) => {
                      const bg =
                        intensity === 0
                          ? "bg-[#F3F4F6]"
                          : intensity === 1
                            ? "bg-[#DBEAFE]"
                            : intensity === 2
                              ? "bg-[#60A5FA]"
                              : "bg-[#FFBE00]";

                      return (
                        <motion.div
                          key={`${wIdx}-${dIdx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3 + wIdx * 0.02 + dIdx * 0.01 }}
                          className={`h-3.5 w-3.5 rounded-[4px] ${bg}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 font-sans text-[11px] text-[#666666]">
                <span>16 weeks ago</span>
                <div className="flex items-center gap-2">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-[3px] bg-[#F3F4F6]" />
                    <div className="h-3 w-3 rounded-[3px] bg-[#DBEAFE]" />
                    <div className="h-3 w-3 rounded-[3px] bg-[#60A5FA]" />
                    <div className="h-3 w-3 rounded-[3px] bg-[#FFBE00]" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        <motion.section
          variants={itemVariants}
          className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.02)] md:p-7"
        >
          <div className="mb-7 flex items-center justify-between gap-4">
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#111111]">
              Recent Assessments
            </h2>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-[#111111] transition-colors hover:text-[#E5AA00]"
            >
              View All <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {assessments.length === 0 ? (
              <p className="col-span-full rounded-[22px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-6 text-center font-sans text-sm text-[#666666]">
                No assessments yet. Submit an assessment and your score will appear here.
              </p>
            ) : (
            assessments.slice(0, 3).map((test) => {
              const isPerfect = test.score === 100;

              return (
                <div
                  key={test.id}
                  className="group rounded-[22px] border border-[#E5E5E5] bg-[#F9F9F7] p-5 transition-all duration-200 hover:border-[#D1D5DB] hover:bg-white hover:shadow-[0_12px_30px_rgba(17,17,17,0.03)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isPerfect ? "bg-[#EAF8F2] text-[#059669]" : "bg-[#F3F4F6] text-[#111111]"}`}>
                      <Trophy size={20} />
                    </div>
                    <span className="font-sans text-[11px] font-medium text-[#666666]">{test.date.slice(0, 10)}</span>
                  </div>

                  <h3 className="font-sans text-[1.05rem] font-bold leading-snug text-[#111111] transition-colors group-hover:text-[#111111]">
                    {test.title}
                  </h3>

                  <div className="mt-5 flex items-end gap-2">
                    <span className={`font-sans text-[2rem] font-black leading-none ${isPerfect ? "text-[#059669]" : "text-[#111111]"}`}>
                      {test.score}%
                    </span>
                    <span className="mb-1 font-sans text-xs text-[#666666]">
                      ({test.total > 0 ? `${test.total} questions` : `${test.marksEarned}/${test.marksAvailable} marks`})
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-[#E5E5E5]">
                      {test.marksEarned}/{test.marksAvailable} marks
                    </span>
                    <ArrowUpRight size={12} className="text-[#111111]" />
                  </div>
                </div>
              );
            })
            )}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
