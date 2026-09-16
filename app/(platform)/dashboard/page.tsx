"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Flame, Target, CheckCircle2, BookOpen, TrendingUp, UserRound } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const weekActivity = [
  { day: "Mon", problems: 8, active: false },
  { day: "Tue", problems: 14, active: false },
  { day: "Wed", problems: 6, active: false },
  { day: "Thu", problems: 20, active: false },
  { day: "Fri", problems: 12, active: false },
  { day: "Sat", problems: 0, active: false },
  { day: "Sun", problems: 16, active: true },
];

const recentActivity = [
  { title: "The Argand Plane", type: "Lesson", time: "2h ago", status: "In Progress" },
  { title: "The Imaginary Unit", type: "Lesson", time: "Yesterday", status: "Completed" },
  { title: "Complex Numbers Practice", type: "Practice", time: "Yesterday", status: "Completed" },
  { title: "Quadratic Theory", type: "Lesson", time: "2 days ago", status: "Completed" },
];

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const countersRef = useRef<(HTMLSpanElement | null)[]>([]);

  const stats = [
    { label: "Overall Mastery", value: 42, suffix: "%", icon: Target, color: "#2563EB" },
    { label: "Day Streak", value: 12, suffix: " days", icon: Flame, color: "#E11D48" },
    { label: "Problems Solved", value: 342, suffix: "", icon: CheckCircle2, color: "#059669" },
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

  const maxProblems = Math.max(...weekActivity.map(d => d.problems), 1);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FBFBFA] px-6 py-6 md:px-12 md:py-8">
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
            <Link href="/courses/math-151/chapter/complex-numbers/lesson/argand-plane" className="group relative block overflow-hidden rounded-[22px] bg-[#111111] p-6 text-white shadow-[0_18px_40px_rgba(17,17,17,0.12)] transition-transform hover:-translate-y-1">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full border border-white/10" />
              <div className="relative">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Continue learning</span>
                  <ArrowRight size={17} className="text-white/70 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="font-sans text-xs text-white/55">Complex Numbers</p>
                <h2 className="mt-1 font-serif text-2xl">The Argand Plane</h2>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-[68%] rounded-full bg-[#93C5FD]" />
                  </div>
                  <span className="font-sans text-xs font-semibold text-white/70">68%</span>
                </div>
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
              {weekActivity.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-3 flex-1">
                  <motion.div
                    className={`w-full rounded-lg ${day.active ? "bg-[#111111]" : "bg-[#F7F7F8] border border-[#E5E5E5]"}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(day.problems / maxProblems) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.05, ease: "easeOut" }}
                    viewport={{ once: true }}
                  />
                  <span className={`font-sans text-[10px] ${day.active ? "text-[#111111] font-bold" : "text-[#666666]"}`}>
                    {day.day}
                  </span>
                </div>
              ))}
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
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === "Lesson" ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-[#4F46E5]/10 text-[#4F46E5]"
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
                      : "bg-[#2563EB]/10 text-[#2563EB]"
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
