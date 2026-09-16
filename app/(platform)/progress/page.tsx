"use client";

import { motion, type Variants } from "framer-motion";
import { Target, Flame, Clock, Trophy, ChevronRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Overall Accuracy", value: "92%", icon: Target, tint: "bg-[#EAF3FF] text-[#2563EB]" },
  { label: "Current Streak", value: "14 Days", icon: Flame, tint: "bg-[#FEE7EC] text-[#E11D48]" },
  { label: "Hours Studied", value: "38.5h", icon: Clock, tint: "bg-[#EAF8F2] text-[#059669]" },
];

const topics = [
  { name: "Real Number Theory", mastery: 100, color: "bg-[#111111]" },
  { name: "Complex Numbers", mastery: 85, color: "bg-[#2563EB]" },
  { name: "Vector Algebra", mastery: 60, color: "bg-[#E11D48]" },
  { name: "Matrices & Systems", mastery: 20, color: "bg-[#D97706]" },
];

const recentTests = [
  { title: "Complex Plane & Modulus", date: "Today", score: 100, total: 5 },
  { title: "Vector Cross Products", date: "Yesterday", score: 80, total: 5 },
  { title: "De Moivre's Theorem", date: "Oct 12", score: 100, total: 10 },
];

const generateHeatmap = () => {
  const weeks = [] as number[][];
  for (let w = 0; w < 16; w++) {
    const days = [] as number[];
    for (let d = 0; d < 7; d++) {
      const isActive = Math.random() > (0.8 - w * 0.03);
      const intensity = isActive ? Math.floor(Math.random() * 3) + 1 : 0;
      days.push(intensity);
    }
    weeks.push(days);
  }
  return weeks;
};

const heatmapData = generateHeatmap();

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
              {topics.map((topic, index) => (
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
                      className={`h-full rounded-full ${topic.color}`}
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
                              : "bg-[#2563EB]";

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
                    <div className="h-3 w-3 rounded-[3px] bg-[#2563EB]" />
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
              className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
            >
              View All <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {recentTests.map((test, index) => {
              const isPerfect = test.score === 100;

              return (
                <div
                  key={test.title}
                  className="group rounded-[22px] border border-[#E5E5E5] bg-[#F9F9F7] p-5 transition-all duration-200 hover:border-[#D1D5DB] hover:bg-white hover:shadow-[0_12px_30px_rgba(17,17,17,0.03)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isPerfect ? "bg-[#EAF8F2] text-[#059669]" : "bg-[#F3F4F6] text-[#111111]"}`}>
                      <Trophy size={20} />
                    </div>
                    <span className="font-sans text-[11px] font-medium text-[#666666]">{test.date}</span>
                  </div>

                  <h3 className="font-sans text-[1.05rem] font-bold leading-snug text-[#111111] transition-colors group-hover:text-[#2563EB]">
                    {test.title}
                  </h3>

                  <div className="mt-5 flex items-end gap-2">
                    <span className={`font-sans text-[2rem] font-black leading-none ${isPerfect ? "text-[#059669]" : "text-[#111111]"}`}>
                      {test.score}%
                    </span>
                    <span className="mb-1 font-sans text-xs text-[#666666]">({test.total} questions)</span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-[#E5E5E5]">
                      {index === 0 ? "Focus" : index === 1 ? "Applied" : "Theory"}
                    </span>
                    <ArrowUpRight size={12} className="text-[#2563EB]" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
