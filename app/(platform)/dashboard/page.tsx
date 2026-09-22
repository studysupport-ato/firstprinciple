"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Flame, Target, CheckCircle2, BookOpen, TrendingUp, UserRound } from "lucide-react";
import { getCourseWeeks, getWeekDays } from "@/lib/curriculum";
import { getActiveStudentId } from "@/lib/auth/mock";
import {
  createProgressFactsRepository,
  type ActivityDisplay,
  type ActivityEvent,
  type ContinueLearning,
  type DailyActivityPoint,
  type PracticeAttempt,
  type AssessmentAttempt,
} from "@/lib/progress";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getPracticeStats(attempts: PracticeAttempt[]) {
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
      occurredAt: attempt.submittedAt ?? attempt.startedAt,
      score: attempt.percentage,
      total: Object.keys(attempt.answers ?? {}).length,
      marksEarned: attempt.marksEarned,
      marksAvailable: attempt.marksAvailable,
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
  if (parts.length === 0) return 0;
  return clampPercent(parts.reduce((sum, value) => sum + value, 0) / parts.length);
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

function getDailyActivity(events: ActivityEvent[], courseId: string, days = 7): DailyActivityPoint[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: DailyActivityPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scoped = events.filter((event) => event.courseId === courseId);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date.toISOString());
    const count = scoped.filter((event) => localDateKey(event.occurredAt) === key).length;
    points.push({ date: key, label: labels[date.getDay()], count });
  }
  return points;
}

function getRecentActivity(events: ActivityEvent[], courseId: string, limit = 4): ActivityDisplay[] {
  return events
    .filter((event) => event.courseId === courseId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      type: event.type.startsWith("lesson_") ? "Lesson" : event.type.startsWith("practice_") || event.type === "question_answered" ? "Practice" : event.type.startsWith("assessment_") ? "Assessment" : "Course",
      title: event.type === "lesson_started" || event.type === "lesson_completed" ? `Lesson ${event.entityId ?? ""}` : event.type === "question_answered" ? "Practice question" : event.type.startsWith("assessment_") ? "Assessment" : "Course activity",
      occurredAt: event.occurredAt,
      time: relativeTime(event.occurredAt),
      status: event.type === "lesson_completed" || event.type === "assessment_submitted" || event.type === "question_answered" ? "Completed" : "In Progress",
      entityId: event.entityId,
    }));
}

function getContinueLearning(courseId: string, dayProgress: Record<string, { status?: string }>): ContinueLearning | null {
  const totalDays = getCourseWeeks(courseId).reduce((count, week) => count + getWeekDays(courseId, week).length, 0);
  const completeCount = Object.values(dayProgress).filter((entry) => entry.status === "completed").length;

  for (const week of getCourseWeeks(courseId)) {
    for (const day of getWeekDays(courseId, week)) {
      const status = dayProgress[day.lessonId]?.status;
      if (status === "in_progress" || status === "not_started" || !status) {
        const lesson = day.lesson;
        if (!lesson) continue;
        return {
          courseId,
          weekId: week.id,
          weekTitle: week.title,
          weekNumber: week.weekNumber,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          chapterId: lesson.chapterId,
          status: status === "in_progress" ? "in_progress" : "not_started",
          completedDays: completeCount,
          totalDays,
          percent: totalDays ? clampPercent((completeCount / totalDays) * 100) : 0,
        };
      }
    }
  }
  return null;
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const countersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [mastery, setMastery] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [weekActivity, setWeekActivity] = useState<DailyActivityPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityDisplay[]>([]);
  const [continueLearning, setContinueLearning] = useState<ContinueLearning | null>(null);

  useEffect(() => {
    let active = true;
    const repository = createProgressFactsRepository("local");

    void (async () => {
      try {
        const studentId = getActiveStudentId();
        const [dayProgressRows, practiceAttempts, assessmentAttempts, activityResult] = await Promise.all([
          repository.listDayProgressForCourse(studentId, "math-151"),
          repository.listPracticeAttempts(studentId, { courseId: "math-151" }),
          repository.listAssessmentAttempts(studentId, { courseId: "math-151" }),
          repository.listActivity(studentId, { courseId: "math-151", limit: 50 }),
        ]);

        if (!active) return;

        const dayProgress = Object.fromEntries(dayProgressRows.map((row) => [row.dayId, row]));
        const practiceStats = getPracticeStats(practiceAttempts);
        setMastery(getOverallMastery(practiceAttempts, assessmentAttempts));
        setStreak(getCurrentStreak(activityResult.events));
        setSolved(practiceStats.problemsSolved);
        setWeekActivity(getDailyActivity(activityResult.events, "math-151", 7));
        setRecentActivity(getRecentActivity(activityResult.events, "math-151", 4));
        setContinueLearning(getContinueLearning("math-151", dayProgress));
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to hydrate dashboard progress from Supabase", error);
        if (active) {
          setMastery(0);
          setStreak(0);
          setSolved(0);
          setWeekActivity([]);
          setRecentActivity([]);
          setContinueLearning(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const hasActivity = weekActivity.some((point) => point.count > 0);
  const maxCount = Math.max(...weekActivity.map((point) => point.count), 1);

  const stats = [
    { label: "Overall Mastery", value: mastery, suffix: "%", icon: Target, color: "#FFBE00" },
    { label: "Day Streak", value: streak, suffix: " days", icon: Flame, color: "#E11D48" },
    { label: "Problems Solved", value: solved, suffix: "", icon: CheckCircle2, color: "#059669" },
  ];

  useGSAP(() => {
    countersRef.current.forEach((el, i) => {
      if (!el) return;
      const target = stats[i].value;
      gsap.fromTo(
        el,
        { innerText: 0 },
        {
          innerText: target,
          duration: 1.8,
          ease: "power3.out",
          snap: { innerText: 1 },
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate() { el.innerText = Math.round(Number(this.targets()[0].innerText)).toString(); },
        }
      );
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-transparent px-6 py-6 md:px-12 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 flex items-center justify-between border-b border-[#E5E5E5] pb-5">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Learning space</span>
            <span className="h-1 w-1 rounded-full bg-[#D1D5DB]" />
            <span className="font-sans text-xs text-[#666666]">MATH 151</span>
          </div>
          <Link
            href="/settings"
            aria-label="Open profile settings"
            title="Profile settings"
            className="group flex items-center gap-3 rounded-full pl-2 pr-1.5 py-1.5 transition-colors hover:bg-white"
          >
            <span className="hidden text-right sm:block">
              <span className="block font-sans text-xs font-semibold text-[#111111]">Kwame Mensah</span>
              <span className="block font-sans text-[10px] text-[#777777]">Student profile</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#111111] shadow-[0_3px_12px_rgba(17,17,17,0.14)] ring-1 ring-[#E5E5E5] transition-transform group-hover:scale-105">
              <img src="https://ui-avatars.com/api/?name=Kwame+Mensah&background=111111&color=fff&size=120" alt="Kwame Mensah" className="h-full w-full object-cover" />
            </span>
          </Link>
        </div>

        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <AnimatedItem>
            <p className="mb-3 font-sans text-sm text-[#666666]">Good evening.</p>
            <h1 className="editorial-heading max-w-2xl text-5xl md:text-6xl">
              Welcome back, Kwame.
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-7 text-[#666666]">
              Keep building from first principles. Your next step is ready when you are.
            </p>
          </AnimatedItem>

          <AnimatedItem delay={0.12} direction="up" distance={18}>
            <Link href={continueLearning ? `/courses/math-151/chapter/${continueLearning.chapterId}/lesson/${continueLearning.lessonId}?week=${continueLearning.weekNumber}` : "/courses/math-151/roadmap"} className="group relative block overflow-hidden rounded-[22px] bg-[#111111] p-6 text-white shadow-[0_18px_40px_rgba(17,17,17,0.12)] transition-transform hover:-translate-y-1">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full border border-white/10" />
              <div className="relative">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Continue learning</span>
                  <ArrowRight size={17} className="text-white/70 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="font-sans text-xs text-white/55">{continueLearning ? continueLearning.weekTitle : "MATH 151"}</p>
                <h2 className="mt-1 font-serif text-2xl">{continueLearning ? continueLearning.lessonTitle : "Start Week 1, Day 1"}</h2>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-[#93C5FD]" style={{ width: `${continueLearning ? continueLearning.percent : 0}%` }} />
                  </div>
                  <span className="font-sans text-xs font-semibold text-white/70">{continueLearning ? `${continueLearning.percent}%` : "0%"}</span>
                </div>
                {mastery === 0 && solved === 0 ? (
                  <p className="mt-3 font-sans text-[11px] text-white/50">Start learning to build mastery</p>
                ) : null}
              </div>
            </Link>
          </AnimatedItem>
        </div>

      {/* Stats Row */}
      <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <AnimatedItem key={stat.label} index={i} delay={0.1} direction="up" distance={20}>
              <div className="group flex min-h-[178px] flex-col justify-between rounded-[20px] border border-[#E5E5E5] bg-white p-7 shadow-[0_8px_24px_rgba(17,17,17,0.025)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(17,17,17,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
                    {stat.label}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl transition-transform group-hover:scale-105" style={{ background: `${stat.color}15`, color: stat.color }}>
                    <Icon size={18} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1" style={{ color: stat.color }}>
                  <span ref={el => { countersRef.current[i] = el; }} className="font-serif text-6xl leading-none tracking-tight">
                    0
                  </span>
                  <span className="font-sans font-semibold text-lg">{stat.suffix}</span>
                </div>
              </div>
            </AnimatedItem>
          );
        })}
      </div>

      {/* Bottom Grid: Activity + Recent */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

        {/* Weekly Activity Chart */}
        <AnimatedItem delay={0.3} direction="up" distance={20} className="xl:col-span-2">
          <div className="h-full rounded-[20px] border border-[#E5E5E5] bg-white p-8 shadow-[0_8px_24px_rgba(17,17,17,0.025)]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-sans font-semibold text-[#111111]">This Week</h3>
              <TrendingUp size={16} className="text-[#666666]" />
            </div>
            <div className="flex items-end justify-between gap-2 h-32">
              {hasActivity ? weekActivity.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-3 flex-1">
                  <motion.div
                    className={`w-full rounded-lg ${day.count > 0 ? "bg-[#111111]" : "bg-transparent border border-[#E5E5E5]"}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${Math.max((day.count / maxCount) * 100, day.count > 0 ? 12 : 6)}%` }}
                    transition={{ duration: 0.8, delay: 0.05, ease: "easeOut" }}
                    viewport={{ once: true }}
                  />
                  <span className={`font-sans text-[10px] ${day.count > 0 ? "text-[#111111] font-bold" : "text-[#666666]"}`}>
                    {day.label}
                  </span>
                </div>
              )) : (
                <p className="w-full py-8 text-center font-sans text-sm text-[#666666]">No activity yet. Complete a day or answer a question to get started.</p>
              )}
            </div>
          </div>
        </AnimatedItem>

        {/* Recent Activity */}
        <AnimatedItem delay={0.4} direction="up" distance={20} className="xl:col-span-3">
          <div className="h-full rounded-[20px] border border-[#E5E5E5] bg-white p-8 shadow-[0_8px_24px_rgba(17,17,17,0.025)]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-sans font-semibold text-[#111111]">Recent Activity</h3>
              <Link href="/courses/math-151" className="text-xs font-sans font-medium text-[#666666] hover:text-[#111111] transition-colors flex items-center gap-1">
                All <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-[#F7F7F8]">
              {recentActivity.length === 0 ? (
                <p className="py-6 text-center font-sans text-sm text-[#666666]">No recent activity yet. Start learning to build your history.</p>
              ) : recentActivity.map((item, i) => (
                <motion.div
                  key={item.id || i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === "Lesson" ? "bg-[#111111]/5 text-[#111111]" : item.type === "Assessment" ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-[#059669]/10 text-[#059669]"
                    }`}>
                      {item.type === "Lesson" ? <BookOpen size={15} /> : <Target size={15} />}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold text-[#111111]">{item.title}</p>
                      <p className="font-sans text-xs text-[#666666]">{item.type} · {item.time}</p>
                    </div>
                  </div>
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    item.status === "Completed"
                      ? "bg-[#059669]/10 text-[#059669]"
                      : "bg-[#111111]/5 text-[#111111]"
                  }`}>
                    {item.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedItem>

      </div>
      </div>
    </div>
  );
}
