"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy, Medal, ArrowUp, ArrowDown, Minus, Flame, Zap, Sparkles, TrendingUp } from "lucide-react";
import { getCourseCompletion, getCurrentStreak, getProblemsSolved } from "@/lib/progress";

type Trend = "up" | "down" | "flat";

type LeaderboardEntry = {
  id: number;
  name: string;
  xp: number;
  streak: number;
  trend: Trend;
  avatar: string;
  isCurrentUser?: boolean;
  badge?: string;
};

const leaderboardData: LeaderboardEntry[] = [
  { id: 1, name: "Osei Kwame", xp: 14250, streak: 21, trend: "up", avatar: "O+K", badge: "Gold" },
  { id: 2, name: "Abena Serwaa", xp: 13800, streak: 18, trend: "up", avatar: "A+S", badge: "Silver" },
  { id: 3, name: "Emmanuel Ofori", xp: 12950, streak: 12, trend: "down", avatar: "E+O", badge: "Bronze" },
  { id: 4, name: "Kwame Mensah", xp: 12100, streak: 14, trend: "up", avatar: "K+M", isCurrentUser: true },
  { id: 5, name: "Ama Boateng", xp: 11500, streak: 8, trend: "flat", avatar: "A+B" },
  { id: 6, name: "Kofi Owusu", xp: 10200, streak: 5, trend: "down", avatar: "K+O" },
  { id: 7, name: "Yaa Asantewaa", xp: 9800, streak: 3, trend: "up", avatar: "Y+A" },
  { id: 8, name: "Kwesi Appiah", xp: 8400, streak: 1, trend: "flat", avatar: "K+A" },
  { id: 9, name: "Nana Adjei", xp: 7900, streak: 6, trend: "up", avatar: "N+A" },
  { id: 10, name: "Efua Agyeman", xp: 7600, streak: 4, trend: "up", avatar: "E+A" },
  { id: 11, name: "Yaw Kusi", xp: 7100, streak: 2, trend: "flat", avatar: "Y+K" },
  { id: 12, name: "Akosua Opoku", xp: 6750, streak: 9, trend: "up", avatar: "A+O" },
  { id: 13, name: "Kojo Bonsu", xp: 6200, streak: 3, trend: "down", avatar: "K+B" },
  { id: 14, name: "Mawusi Boadu", xp: 5900, streak: 2, trend: "flat", avatar: "M+B" },
];

const statCards = [
  { label: "Top XP", value: "14.2k", icon: Zap, tint: "bg-[#F3F4F6] text-[#111111]" },
  { label: "Avg. streak", value: "8.4d", icon: Flame, tint: "bg-[#FFF7ED] text-[#B45309]" },
  { label: "Active this week", value: "84%", icon: TrendingUp, tint: "bg-[#ECFDF5] text-[#047857]" },
];

const weekdayFilters = ["This week", "This month", "All time"];

function trendIcon(trend: Trend) {
  if (trend === "up") return <ArrowUp size={16} className="text-[#10B981]" />;
  if (trend === "down") return <ArrowDown size={16} className="text-[#EF4444]" />;
  return <Minus size={16} className="text-[#6B7280]" />;
}

function trendClass(trend: Trend) {
  if (trend === "up") return "text-[#059669] bg-[#ECFDF5]";
  if (trend === "down") return "text-[#DC2626] bg-[#FEF2F2]";
  return "text-[#4B5563] bg-[#F3F4F6]";
}

export default function LeaderboardPage() {
  const [rankedStudents, setRankedStudents] = useState(leaderboardData);

  useEffect(() => {
    // The sample cohort stays prototype data, but the current user's row must
    // reflect real local progress. Display-only XP formula (prototype).
    const xp = getProblemsSolved("math-151") * 10 + getCourseCompletion("math-151").completedDays * 50;
    const streak = getCurrentStreak();
    setRankedStudents((current) => current.map((student) => (student.isCurrentUser ? { ...student, xp, streak } : student)));
  }, []);

  useEffect(() => {
    const movements = [
      { studentId: 4, direction: -1 },
      { studentId: 3, direction: 1 },
      { studentId: 5, direction: -1 },
      { studentId: 4, direction: 1 },
      { studentId: 6, direction: -1 },
      { studentId: 5, direction: 1 },
    ];
    let movementIndex = 0;

    const moveStudent = () => {
      const movement = movements[movementIndex % movements.length];
      movementIndex += 1;

      setRankedStudents((current) => {
        const currentIndex = current.findIndex((student) => student.id === movement.studentId);
        const targetIndex = currentIndex + movement.direction;

        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return current;

        const next = [...current];
        const [student] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, student);
        return next;
      });
    };

    const interval = window.setInterval(moveStudent, 2600);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-8 md:px-10 md:py-12">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center"
      >
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-[#111111]">
            <Trophy size={22} className="text-[#D97706]" />
          </div>
          <h1 className="font-serif text-4xl tracking-tight text-[#111111] md:text-6xl">Class Rankings</h1>
        </div>

        <p className="mx-auto max-w-2xl font-sans text-base text-[#666666] md:text-lg">
          MATH 151 • Top students this week based on XP and consistency.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {weekdayFilters.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-sans font-medium transition-all ${
              index === 0
                ? "bg-[#111111] text-white shadow-sm"
                : "bg-white text-[#666666] ring-1 ring-[#E5E5E5] hover:text-[#111111]"
            }`}
          >
            {filter}
          </button>
        ))}
      </motion.div>

      <div className="mb-12 flex items-center justify-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#777777]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
        Live standings
      </div>

      <div className="flex flex-col items-end justify-center gap-4 md:flex-row md:gap-6">
        <motion.div
          key={`second-${rankedStudents[1].id}`}
          layout
          initial={{ opacity: 0, y: 70, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="order-2 w-full md:order-1 md:w-[220px]"
        >
          <div className="relative flex h-[190px] flex-col items-center justify-end rounded-[24px] border border-[#E5E5E5] bg-gradient-to-b from-[#F3F4F6] to-[#EEF2F7] p-5 shadow-[0_12px_30px_rgba(17,17,17,0.03)]">
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.4 }}
              className="absolute -top-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#E5E5E5] bg-white shadow-md"
            >
              <img src={`https://ui-avatars.com/api/?name=${rankedStudents[1].avatar}&background=f8fafc&color=475569&size=150`} alt={`${rankedStudents[1].name} avatar`} />
            </motion.div>
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.42, delay: 0.5 }}
              className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E5E5] font-sans text-sm font-bold text-[#4B5563]"
            >
              2
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.55 }}
              className="text-center"
            >
              <div className="font-sans text-lg font-bold text-[#111111]">{rankedStudents[1].name}</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">
                {rankedStudents[1].xp.toLocaleString()} XP
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          key={`first-${rankedStudents[0].id}`}
          layout
          initial={{ opacity: 0, y: 90, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 w-full md:order-2 md:w-[260px]"
        >
          <div className="relative flex h-[230px] flex-col items-center justify-end rounded-[26px] border border-[#F4D67B] bg-gradient-to-b from-[#F8E9A6] to-[#F4E6BF] p-6 shadow-[0_18px_36px_rgba(217,170,43,0.15)]">
            <motion.div
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="absolute -top-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#F1D589] bg-white shadow-lg"
            >
              <img src={`https://ui-avatars.com/api/?name=${rankedStudents[0].avatar}&background=fffbeb&color=d97706&size=150`} alt={`${rankedStudents[0].name} avatar`} />
            </motion.div>
            <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.38 }}>
              <Medal className="mb-2 text-[#D97706]" size={28} />
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.42 }}
              className="text-center"
            >
              <div className="font-sans text-xl font-bold text-[#111111]">{rankedStudents[0].name}</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#92400E]">
                {rankedStudents[0].xp.toLocaleString()} XP
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          key={`third-${rankedStudents[2].id}`}
          layout
          initial={{ opacity: 0, y: 70, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="order-3 w-full md:w-[220px]"
        >
          <div className="relative flex h-[170px] flex-col items-center justify-end rounded-[24px] border border-[#F0C7A6] bg-gradient-to-b from-[#F9E6D2] to-[#F3D4B7] p-5 shadow-[0_12px_30px_rgba(17,17,17,0.03)]">
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.52 }}
              className="absolute -top-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#F0C7A6] bg-white shadow-md"
            >
              <img src={`https://ui-avatars.com/api/?name=${rankedStudents[2].avatar}&background=fff7ed&color=c2410c&size=150`} alt={`${rankedStudents[2].name} avatar`} />
            </motion.div>
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.42, delay: 0.62 }}
              className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#F7D8B7] font-sans text-sm font-bold text-[#B45309]"
            >
              3
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.67 }}
              className="text-center"
            >
              <div className="font-sans text-lg font-bold text-[#111111]">{rankedStudents[2].name}</div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A4D14]">
                {rankedStudents[2].xp.toLocaleString()} XP
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5 }}
        className="overflow-hidden rounded-[28px] border border-[#E5E5E5] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.03)]"
      >
        <div className="hidden grid-cols-12 gap-4 border-b border-[#E5E5E5] bg-[#F7F7F8] p-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#666666] md:grid">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-5">Student</div>
          <div className="col-span-2 text-center">Streak</div>
          <div className="col-span-2 text-right">Experience</div>
          <div className="col-span-2 text-center">Trend</div>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {rankedStudents.slice(3).map((student, idx) => {
            const rank = idx + 4;
            const currentUser = student.isCurrentUser;
            return (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  layout: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.38, delay: 0.52 + idx * 0.06 },
                  y: { duration: 0.38, delay: 0.52 + idx * 0.06 },
                }}
                className={`grid grid-cols-12 items-center gap-3 p-4 transition-colors md:gap-4 ${
                  currentUser ? "bg-[#EEF6FF]" : "hover:bg-[#F7F7F8]"
                }`}
              >
                <div className="col-span-2 flex justify-center md:col-span-1">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] font-sans text-sm font-bold text-[#475569]">
                    {rank}
                  </span>
                </div>

                <div className="col-span-7 flex items-center gap-3 md:col-span-5">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.65 + idx * 0.06 }}
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#E5E5E5]"
                  >
                    <img src={`https://ui-avatars.com/api/?name=${student.avatar}&background=111111&color=fff&size=100`} alt="Avatar" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className={`truncate font-sans text-base font-bold ${currentUser ? "text-[#FFBE00]" : "text-[#111111]"}`}>
                      {student.name}
                      {currentUser && " (You)"}
                    </div>
                    {student.badge && (
                      <div className="mt-1 inline-flex rounded-full bg-[#F3F4F6] px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666]">
                        {student.badge}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex items-center justify-center md:col-span-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2.5 py-1 font-sans text-xs font-semibold text-[#4B5563]">
                    <Flame size={12} className="text-[#F59E0B]" />
                    {student.streak}d
                  </span>
                </div>

                <div className="hidden md:flex md:col-span-2 md:items-center md:justify-end">
                  <span className="font-sans font-semibold text-[#111111]">{student.xp.toLocaleString()} XP</span>
                </div>

                <div className="col-span-3 flex justify-end md:col-span-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${trendClass(student.trend)}`}>
                    {trendIcon(student.trend)}
                    <span className="hidden md:inline">{student.trend === "up" ? "Rising" : student.trend === "down" ? "Falling" : "Steady"}</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
