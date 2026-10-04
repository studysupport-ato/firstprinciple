"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EducationalText } from "@/components/learning/EducationalText";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Flame, Target, CheckCircle2, BookOpen, CalendarDays, TrendingUp, UserRound } from "lucide-react";
import { listPublishedCourseStructureSummaries, type PublishedCourseStructureSummary } from "@/lib/content/publishedStructure";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveAuthenticatedReadStudentId } from "@/lib/student/readIdentity";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import {
  readRecentActivity,
  readStudentAttemptFacts,
  readStudentDayProgressMap,
} from "@/lib/student/readProgress";
import { createCourseStructureSupabaseRepository } from "@/lib/content/repository";
import {
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

function getContinueLearning(
  courseId: string,
  dayProgress: Record<string, { status?: string }>,
  summary: PublishedCourseStructureSummary | undefined,
): ContinueLearning | null {
  // Task 40F.2: the published Course -> Week -> Day structure (database order)
  // is the only source of the resume position and the completion denominator.
  const publishedDays = summary?.days ?? [];
  const totalDays = publishedDays.length;
  const completeCount = Object.values(dayProgress).filter((entry) => entry.status === "completed").length;

  for (const day of publishedDays) {
    const status = dayProgress[day.dayId]?.status;
    if (status === "in_progress" || status === "not_started" || !status) {
      return {
        courseId,
        weekId: day.weekId,
        weekTitle: day.weekTitle,
        weekNumber: day.weekNumber,
        lessonId: day.dayId,
        lessonTitle: day.title,
        chapterId: day.chapterId ?? "",
        status: status === "in_progress" ? "in_progress" : "not_started",
        completedDays: completeCount,
        totalDays,
        percent: totalDays ? clampPercent((completeCount / totalDays) * 100) : 0,
      };
    }
  }
  return null;
}

type DashboardCourse = {
  id: string;
  code: string;
  title: string;
  mastery: number;
  description: string;
  weeks: number;
  days: number;
};

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
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  // Real student identity: auth session -> students.display_name. Never a static
  // demo name for an authenticated user.
  const { student } = useAuthSession();
  const displayName = (student?.displayName ?? "").trim();
  const firstName = displayName.split(/\s+/)[0] ?? "";
  const nameInitials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S";

  useEffect(() => {
    let active = true;
    const courseRepository = createCourseStructureSupabaseRepository();

    void (async () => {
      try {
        // Task 40C-1: canonical real-auth read identity.
        //   session -> auth.users.id -> students.auth_user_id -> students.id
        // Never local-student / demo-student-* for an authenticated user.
        const studentId = await resolveAuthenticatedReadStudentId();

        const courseRows = await courseRepository.listCourses();
        // Task 40F.2: authoritative published Course -> Week -> Day structure.
        // Two batched queries for all cards (weeks + days) — no N+1. Uses the
        // browser (publishable) client: this is public published content.
        const structure = await listPublishedCourseStructureSummaries(
          courseRows.map((course) => course.id),
          createSupabaseBrowserClient,
        );

        // Unauthenticated: show the signed-out experience. Do NOT query private
        // student facts under a mock/local identity.
        if (!studentId) {
          if (!active) return;
          setMastery(0);
          setStreak(0);
          setSolved(0);
          setWeekActivity([]);
          setRecentActivity([]);
          setContinueLearning(null);
          setCourses(
            courseRows
              .filter((course) => !course.status || course.status === "published")
              .map((course) => {
                // Task 40F.2: authoritative published week/day counts.
                const summary = structure[course.id];
                return {
                  id: course.id,
                  code: course.code,
                  title: course.title,
                  description: course.description,
                  weeks: summary?.weekCount ?? 0,
                  days: summary?.dayCount ?? 0,
                  mastery: 0,
                };
              }),
          );
          return;
        }

        // Fetch each fact ONCE (no per-course round trips), then derive the
        // per-course figures in memory. Same queries as the N+1 version for
        // math-151, but a constant count regardless of course count.
        // The attempt lists are fetched without a course filter so one query
        // serves every course card; the limit keeps that bounded.
        // Task 40E.6: all repository reads now go through lib/student/readProgress.ts.
        const ATTEMPT_WINDOW = 500;
        const [dayProgress, { practiceAttempts, assessmentAttempts }, activityEvents] = await Promise.all([
          readStudentDayProgressMap("math-151"),
          readStudentAttemptFacts(studentId, { limit: ATTEMPT_WINDOW }),
          readRecentActivity(studentId, { courseId: "math-151", limit: 50 }),
        ]);

        if (!active) return;

        // Signed-in guard: the helpers resolve the same identity, so this only
        // trips if the session disappeared mid-flight.
        if (!dayProgress) {
          setMastery(0);
          setStreak(0);
          setSolved(0);
          setWeekActivity([]);
          setRecentActivity([]);
          setContinueLearning(null);
          setCourses([]);
          return;
        }

        const coursePracticeAttempts = practiceAttempts.filter((attempt) => attempt.courseId === "math-151");
        const courseAssessmentAttempts = assessmentAttempts.filter((attempt) => attempt.courseId === "math-151");

        const courseFacts = courseRows
          .filter((course) => !course.status || course.status === "published")
          .map((course) => {
            // Task 40F.2: authoritative published week/day counts.
            const summary = structure[course.id];
            return {
              id: course.id,
              code: course.code,
              title: course.title,
              description: course.description,
              weeks: summary?.weekCount ?? 0,
              days: summary?.dayCount ?? 0,
              mastery:
                course.id === "math-151"
                  ? getOverallMastery(coursePracticeAttempts, courseAssessmentAttempts)
                  : getOverallMastery(
                      practiceAttempts.filter((attempt) => attempt.courseId === course.id),
                      assessmentAttempts.filter((attempt) => attempt.courseId === course.id),
                    ),
            };
          });

        if (!active) return;

        const practiceStats = getPracticeStats(coursePracticeAttempts);
        setMastery(getOverallMastery(coursePracticeAttempts, courseAssessmentAttempts));
        setStreak(getCurrentStreak(activityEvents));
        setSolved(practiceStats.problemsSolved);
        setWeekActivity(getDailyActivity(activityEvents, "math-151", 7));
        setRecentActivity(getRecentActivity(activityEvents, "math-151", 4));
        setContinueLearning(getContinueLearning("math-151", dayProgress, structure["math-151"]));
        setCourses(courseFacts);
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to hydrate dashboard progress from Supabase", error);
        if (active) {
          setMastery(0);
          setStreak(0);
          setSolved(0);
          setWeekActivity([]);
          setRecentActivity([]);
          setContinueLearning(null);
          setCourses([]);
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
    { label: "Overall Mastery", value: mastery, suffix: "%", icon: Target, color: "#E5A600" },
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

  const lessonHref = continueLearning
    ? `/courses/math-151/chapter/${continueLearning.chapterId}/lesson/${continueLearning.lessonId}?week=${continueLearning.weekNumber}`
    : "/courses/math-151/roadmap";

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-clip bg-[#FFC700] pb-10">
      {/* BUILDING — true overflow: page-level, bleeds off right edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 top-0 z-0"
        style={{ mixBlendMode: "multiply" }}
      >
        <div
          className="absolute right-[-40px] top-0 h-[400px] w-[82%] min-w-[760px] max-[900px]:left-0 max-[900px]:right-auto max-[900px]:h-[220px] max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:opacity-60"
          style={{
            backgroundImage: "url('/DASHBOARD.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "left center",
            filter: "grayscale(1) contrast(1.15) brightness(1.35)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 55%, transparent 82%)",
            WebkitMaskComposite: "source-in",
            maskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 55%, transparent 82%)",
            maskComposite: "intersect",
          }}
        />
      </div>

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">
            <div className="mb-[14px] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#111111]/60">
                <span>Learning space</span>
                <span className="text-[8px]">●</span>
                <span className="text-[#111111]/80">MATH 151</span>
              </div>

              <Link
                href="/settings"
                aria-label="Open profile settings"
                title="Profile settings"
                className="group flex items-center gap-2.5 rounded-full bg-black/[0.08] py-1 pl-1 pr-4 backdrop-blur-[2px]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#111111] text-[11px] font-black text-[#FFC700] transition-transform group-hover:scale-105">
                  {nameInitials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block font-sans text-[13px] font-bold leading-tight text-[#111111]">{displayName || "Student"}</span>
                  <span className="block font-sans text-[11px] leading-tight text-[#111111]/55">Student profile</span>
                </span>
              </Link>
            </div>

            <div className="relative mb-[10px]">
              <AnimatedItem>
                <p className="mb-[6px] mt-[26px] font-sans text-[15px] font-normal text-[#1d1d1d]">Good afternoon,</p>
                <h1 className="max-w-[560px] font-sans text-[46px] font-black leading-[1.0] tracking-[-0.01em] text-[#0c0c0c] max-[900px]:text-[30px]">
                  WELCOME BACK,
                  <span className="block">{(firstName || "STUDENT").toUpperCase()}.</span>
                </h1>
                <p className="mb-[20px] mt-[12px] max-w-[470px] text-[13.5px] leading-[1.55] text-[#333]/75">
                  Keep building from first principles — your next step in Real Number Theory is ready whenever you are.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href={continueLearning ? `/courses/math-151/chapter/${continueLearning.chapterId}/lesson/${continueLearning.lessonId}?week=${continueLearning.weekNumber}` : "/courses/math-151/roadmap"}
                    className="inline-flex items-center justify-center rounded-full bg-[#0e0e0e] px-[20px] py-[11px] text-[12.5px] font-bold text-[#FFC700] transition hover:-translate-y-0.5"
                  >
                    Resume last lesson →
                  </Link>
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center rounded-full border-[1.2px] border-black/50 bg-transparent px-[20px] py-[11px] text-[12.5px] font-bold text-[#0e0e0e] transition hover:bg-black/5"
                  >
                    Browse courses
                  </Link>
                </div>
              </AnimatedItem>

            </div>

            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-3">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <AnimatedItem key={stat.label} index={i} delay={0.08} direction="up" distance={18}>
                    <div className="rounded-[20px] bg-white px-[20px] pb-[22px] pt-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                      <div className="mb-[30px] flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/50">{stat.label}</span>
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full" style={{ background: `${stat.color}1F`, color: stat.color }}>
                          <Icon size={18} strokeWidth={2.2} />
                        </div>
                      </div>

                      <div className="flex items-end gap-[5px]" style={{ color: stat.color }}>
                        <span ref={(el) => { countersRef.current[i] = el; }} className="font-sans text-[42px] font-extrabold leading-none tracking-[-0.02em]">
                          0
                        </span>
                        <span className="mb-[6px] text-[16px] font-bold text-[#111111]">{stat.suffix}</span>
                      </div>
                    </div>
                  </AnimatedItem>
                );
              })}
            </div>

            <div className="mb-1 mt-8 text-[20px] font-black tracking-[-0.05em] text-[#111111]">Available Courses</div>
            <p className="mb-4 text-[13px] font-medium text-[#111111]/55">Explore other courses and expand your knowledge.</p>

            <div className="grid gap-4 md:grid-cols-3">
              {courses.map((course, i) => (
                <AnimatedItem key={course.id} index={i} delay={0.08} direction="up" distance={18}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="group relative flex min-h-[240px] flex-col overflow-hidden rounded-[16px] bg-white p-5 pr-[128px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.10)]"
                  >
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F5A800]">{course.code}</div>
                    <div className="mt-1.5 text-[17px] font-extrabold leading-snug text-[#111111]"><EducationalText text={course.title} /></div>
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#111111]/60"><EducationalText text={course.description} /></p>

                    <div className="mt-3 flex items-center gap-5 text-[12px] font-semibold text-[#111111]/55">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} strokeWidth={2.2} className="text-[#111111]/45" />
                        {course.weeks} {course.weeks === 1 ? "week" : "weeks"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} strokeWidth={2.2} className="text-[#111111]/45" />
                        {course.days} {course.days === 1 ? "day" : "days"}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-bold text-[#111111]">
                      View Course
                      <ArrowRight size={15} strokeWidth={2.6} className="text-[#F5A800] transition-transform group-hover:translate-x-1" />
                    </div>

                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[112px] overflow-hidden">
                      <img
                        src={`/hero-images/img${(i % 5) + 1}${i % 5 === 4 ? ".webp" : ".jpg"}`}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-cover grayscale"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
                      <div className="absolute right-0 top-0 h-[44px] w-[18px] rounded-bl-[10px] bg-[#FFC700]" />
                    </div>
                  </Link>
                </AnimatedItem>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
