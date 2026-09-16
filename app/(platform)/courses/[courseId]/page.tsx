"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";
import { Play, Map, BarChart, Clock, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";

const courses = {
  "math-151": {
    id: "math-151",
    code: "MATH 151",
    title: "Algebra",
    description: "A foundational approach to mathematical structures. We strip away memorized formulas and rebuild the number system, complex plane, and vector spaces from absolute first principles.",
    progress: 42,
    nextLesson: {
      chapter: "Complex Numbers",
      title: "The Argand Plane",
      duration: "15 min",
      href: "/courses/math-151/chapter/complex-numbers/lesson/argand-plane",
    },
    stats: [
      { label: "Lessons Completed", value: "14/32" },
      { label: "Problems Solved", value: "128" },
      { label: "Current Streak", value: "3 Days" },
    ],
    hasRoadmap: true,
  },
  "basic-mechanics": {
    id: "basic-mechanics",
    code: "PHYS 151",
    title: "Basic Mechanics",
    description: "Motion, forces, energy, and momentum developed from the fundamental principles of mechanics.",
    progress: 0,
    nextLesson: null,
    stats: [
      { label: "Lessons Completed", value: "0/0" },
      { label: "Problems Solved", value: "0" },
      { label: "Current Streak", value: "0 Days" },
    ],
    hasRoadmap: false,
  },
  "applied-electricity": {
    id: "applied-electricity",
    code: "EE 151",
    title: "Applied Electricity",
    description: "Electrical quantities, circuits, and systems introduced through practical first-principles reasoning.",
    progress: 0,
    nextLesson: null,
    stats: [
      { label: "Lessons Completed", value: "0/0" },
      { label: "Problems Solved", value: "0" },
      { label: "Current Streak", value: "0 Days" },
    ],
    hasRoadmap: false,
  },
} as const;

export default function CourseOverviewPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const courseData = courses[courseId as keyof typeof courses] ?? {
    id: courseId,
    code: "COURSE",
    title: "Course",
    description: "This course is being prepared. Lessons and practice materials will appear here soon.",
    progress: 0,
    nextLesson: null,
    stats: [
      { label: "Lessons Completed", value: "0/0" },
      { label: "Problems Solved", value: "0" },
      { label: "Current Streak", value: "0 Days" },
    ],
    hasRoadmap: false,
  };
  
  return (
    <div className="p-8 md:p-16 max-w-[1200px] mx-auto">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-12">
        <Link href="/courses" className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#666666] hover:text-[#111111] transition-colors">
          Courses
        </Link>
        <span className="text-[#E5E5E5]">/</span>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
          {courseData.code}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        
        {/* Left Column: Course Info & Next Action */}
        <div className="xl:col-span-8 flex flex-col gap-12">
          
          <AnimatedItem>
            <h1 className="editorial-heading text-5xl md:text-6xl mb-6">{courseData.title}</h1>
            <p className="editorial-body text-lg text-[#666666] max-w-2xl leading-relaxed">
              {courseData.description}
            </p>
          </AnimatedItem>

          {/* Up Next Card */}
          <AnimatedItem delay={0.1} direction="up" distance={20}>
            <div className="bg-[#111111] text-white rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563EB] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#2563EB] mb-4 block">
                    {courseData.nextLesson ? "Up Next" : "Course Status"}
                  </span>
                  <h3 className="font-serif text-3xl mb-2">
                    {courseData.nextLesson ? courseData.nextLesson.title : "Building the learning path"}
                  </h3>
                  <p className="font-sans text-sm text-[#A0A0A0]">
                    {courseData.nextLesson ? `Chapter 3: ${courseData.nextLesson.chapter}` : "Lessons and practice materials will appear here soon."}
                  </p>
                </div>
                
                {courseData.nextLesson ? (
                  <Link href={courseData.nextLesson.href} className="flex-shrink-0">
                    <button className="flex items-center gap-3 bg-white text-[#111111] px-6 py-3 rounded-full text-sm font-semibold hover:scale-105 transition-transform">
                      <Play size={16} className="fill-[#111111]" />
                      Resume Learning
                    </button>
                  </Link>
                ) : (
                  <span className="flex-shrink-0 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-[#A0A0A0]">
                    Content coming soon
                  </span>
                )}
              </div>
            </div>
          </AnimatedItem>

          {/* Quick Stats */}
          <AnimatedItem delay={0.2} direction="up" distance={20}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courseData.stats.map((stat, i) => (
                <div key={i} className="bg-white border border-[#E5E5E5] p-6 rounded-2xl flex flex-col gap-2">
                  <span className="font-sans text-[10px] font-semibold tracking-widest uppercase text-[#666666]">
                    {stat.label}
                  </span>
                  <span className="font-serif text-3xl text-[#111111]">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </AnimatedItem>

        </div>

        {/* Right Column: Navigation & Progress */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          <AnimatedItem delay={0.3} direction="left" distance={20}>
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 flex flex-col gap-6">
              <h4 className="font-sans font-semibold text-[#111111]">Course Progress</h4>
              
              <div className="flex items-end justify-between">
                <span className="font-serif text-5xl tracking-tight text-[#111111] leading-none">
                  {courseData.progress}<span className="text-2xl text-[#666666]">%</span>
                </span>
              </div>
              
              <div className="h-2 w-full bg-[#F7F7F8] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#2563EB] rounded-full"
                  style={{ width: `${courseData.progress}%` }}
                />
              </div>
            </div>
          </AnimatedItem>

          <AnimatedItem delay={0.4} direction="left" distance={20}>
            {courseData.hasRoadmap ? <Link href={`/courses/${courseData.id}/roadmap`} className="block group">
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 flex items-center justify-between hover:border-[#111111] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F7F7F8] flex items-center justify-center text-[#111111] group-hover:bg-[#111111] group-hover:text-white transition-colors">
                    <Map size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans font-semibold text-[#111111]">{courseData.hasRoadmap ? "Spatial Roadmap" : "Course outline"}</span>
                    <span className="font-sans text-xs text-[#666666]">{courseData.hasRoadmap ? "View full curriculum" : "Coming soon"}</span>
                  </div>
                </div>
              </div>
            </Link> : (
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F7F7F8] flex items-center justify-center text-[#111111]">
                    <Map size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans font-semibold text-[#111111]">Course outline</span>
                    <span className="font-sans text-xs text-[#666666]">Coming soon</span>
                  </div>
                </div>
              </div>
            )}
          </AnimatedItem>

        </div>

      </div>
    </div>
  );
}
