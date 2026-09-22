"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, PlayCircle, PenLine, Clock, BookOpen } from "lucide-react";
import { useParams } from "next/navigation";

// Map of chapter IDs to their content
const chapterMeta: Record<string, {
  title: string;
  week: string;
  description: string;
  duration: string;
  lessons: { id: string; title: string; duration: string }[];
}> = {
  "axioms": {
    title: "The Field Axioms",
    week: "Week 1 — Real Number Theory",
    description: "Every mathematical system you have ever used rests on a small set of foundational laws. We call them axioms — statements we accept as true without proof, and from which all else follows.",
    duration: "25 min",
    lessons: [
      { id: "intro", title: "What is an Axiom?", duration: "8 min" },
      { id: "field-laws", title: "The 11 Field Axioms", duration: "12 min" },
      { id: "consequences", title: "Consequences of the Axioms", duration: "5 min" },
    ]
  },
  "inequalities": {
    title: "Inequalities & Absolute Value",
    week: "Week 1 — Real Number Theory",
    description: "Inequalities describe relationships between quantities that are not necessarily equal. The absolute value function measures distance from zero — a concept far deeper than it first appears.",
    duration: "30 min",
    lessons: [
      { id: "intro", title: "Order Axioms", duration: "10 min" },
      { id: "solving", title: "Solving Inequalities", duration: "12 min" },
      { id: "absolute", title: "The Absolute Value Function", duration: "8 min" },
    ]
  },
  "argand-plane": {
    title: "The Argand Plane",
    week: "Week 3 — Complex Numbers",
    description: "We extend the number line to a full 2D plane. Every complex number $a + bi$ becomes a point in space, and suddenly arithmetic becomes geometry.",
    duration: "20 min",
    lessons: [
      { id: "argand-plane", title: "From 1D to 2D", duration: "8 min" },
      { id: "modulus", title: "Modulus & Argument", duration: "7 min" },
      { id: "operations", title: "Geometric Operations", duration: "5 min" },
    ]
  },
  "cross-product": {
    title: "The Cross Product",
    week: "Week 4 — Vector Algebra",
    description: "Unlike the dot product which collapses two vectors into a single number, the cross product generates a brand new vector. This vector lives in 3D space, perpendicular to both its parents.",
    duration: "25 min",
    lessons: [
      { id: "cross-product", title: "Vectors in 3D Space", duration: "5 min" },
      { id: "cross-product", title: "The Cross Product", duration: "8 min" },
      { id: "cross-product", title: "Orthogonality", duration: "7 min" },
      { id: "cross-product", title: "The Right-Hand Rule", duration: "5 min" },
    ]
  },
};

// Fallback for unknown chapter IDs
const defaultChapter = {
  title: "Chapter",
  week: "MATH 151",
  description: "This chapter covers foundational mathematical concepts designed to build deep, compounding understanding.",
  duration: "30 min",
  lessons: [
    { id: "intro", title: "Introduction", duration: "10 min" },
    { id: "core", title: "Core Concepts", duration: "15 min" },
    { id: "practice", title: "Applied Problems", duration: "5 min" },
  ]
};

export default function ChapterLandingPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const chapterId = params.chapterId as string;

  const chapter = chapterMeta[chapterId] || { ...defaultChapter, title: chapterId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) };

  // Determine the correct lesson base path
  // Vector-algebra chapters have their own specific routes
  const lessonBasePath = chapterId === "cross-product"
    ? `/courses/${courseId}/chapter/vector-algebra/lesson`
    : `/courses/${courseId}/chapter/${chapterId}/lesson`;

  const practicePath = chapterId === "cross-product"
    ? `/courses/${courseId}/chapter/vector-algebra/practice`
    : `/courses/${courseId}/chapter/${chapterId}/practice`;

  return (
    <div className="min-h-screen bg-transparent p-8 md:p-16">
      <div className="max-w-3xl mx-auto">
        
        {/* Breadcrumb */}
        <Link
          href={`/courses/${courseId}/roadmap`}
          className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-[#666666] hover:text-[#111111] transition-colors mb-12"
        >
          <ChevronLeft size={16} /> Spatial Roadmap
        </Link>

        {/* Chapter Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#FFBE00] block mb-3">
            {chapter.week}
          </span>
          <h1 className="editorial-heading text-4xl md:text-5xl text-[#111111] mb-6">
            {chapter.title}
          </h1>
          <p className="font-sans text-lg text-[#666666] leading-relaxed max-w-2xl">
            {chapter.description}
          </p>
        </motion.div>

        {/* Chapter Stats */}
        <div className="flex items-center gap-6 mb-12 font-sans text-sm text-[#666666]">
          <span className="flex items-center gap-2">
            <Clock size={16} />
            {chapter.duration} total
          </span>
          <span className="flex items-center gap-2">
            <BookOpen size={16} />
            {chapter.lessons.length} lessons
          </span>
        </div>

        {/* Start CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-[#111111] text-white rounded-3xl p-8 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <span className="font-sans text-[10px] uppercase tracking-widest text-white/50 block mb-2">
              Start Here
            </span>
            <h2 className="font-serif text-2xl">{chapter.lessons[0].title}</h2>
            <span className="font-sans text-sm text-white/50 mt-1 block">{chapter.lessons[0].duration}</span>
          </div>
          <Link href={`${lessonBasePath}/${chapter.lessons[0].id}`} className="flex-shrink-0">
            <button className="flex items-center gap-3 bg-white text-[#111111] px-6 py-3 rounded-full text-sm font-bold hover:scale-105 transition-transform">
              <PlayCircle size={18} />
              Begin Chapter
            </button>
          </Link>
        </motion.div>

        {/* Lessons List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white border border-[#E5E5E5] rounded-3xl overflow-hidden mb-6"
        >
          <div className="px-8 py-5 border-b border-[#E5E5E5]">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#666666]">
              All Lessons
            </span>
          </div>
          <div className="divide-y divide-[#E5E5E5]">
            {chapter.lessons.map((lesson, idx) => (
              <Link
                key={idx}
                href={`${lessonBasePath}/${lesson.id}`}
                className="flex items-center justify-between px-8 py-5 hover:bg-transparent transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className="w-7 h-7 rounded-full bg-transparent group-hover:bg-[#111111] flex items-center justify-center font-sans text-xs font-bold text-[#666666] group-hover:text-white transition-colors flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-sans font-medium text-[#111111]">{lesson.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-xs text-[#666666]">{lesson.duration}</span>
                  <PlayCircle size={16} className="text-[#E5E5E5] group-hover:text-[#111111] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Practice CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Link href={practicePath}>
            <div className="bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-3xl p-8 flex items-center justify-between transition-colors group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-transparent group-hover:bg-[#111111] flex items-center justify-center transition-colors">
                  <PenLine size={20} className="text-[#111111] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="font-sans font-bold text-[#111111] block">Practice Assessment</span>
                  <span className="font-sans text-sm text-[#666666]">Test your understanding with questions</span>
                </div>
              </div>
              <ChevronLeft size={20} className="text-[#E5E5E5] group-hover:text-[#111111] rotate-180 transition-colors" />
            </div>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
