"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";

const courses = [
  {
    code: "MATH 151",
    title: "Algebra",
    status: "Available Now",
    description: "Number systems, complex numbers, and vector algebra from first principles.",
    available: true,
  },
  {
    code: "MATH 152",
    title: "Calculus I",
    status: "Coming Semester 2",
    description: "Limits, continuity, differentiation, and the fundamental theorem of calculus.",
    available: false,
  },
  {
    code: "STAT 101",
    title: "Probability & Statistics",
    status: "In Development",
    description: "Distributions, hypothesis testing, and foundational data science.",
    available: false,
  },
  {
    code: "MATH 231",
    title: "Linear Algebra",
    status: "In Development",
    description: "Vector spaces, matrices, eigenvalues, and linear transformations.",
    available: false,
  },
];

export function CourseDiscovery() {
  return (
    <section id="platform" className="py-32 bg-transparent border-t border-[#E5E5E5]">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        <AnimatedItem className="mb-16 flex flex-col items-center text-center">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4">
            The Platform
          </span>
          <h2 className="editorial-heading text-4xl sm:text-5xl max-w-2xl">
            Beyond Algebra.
          </h2>
          <p className="editorial-body max-w-xl mt-6">
            MATH 151 is just the beginning. We are actively building the complete core curriculum for university mathematics.
          </p>
        </AnimatedItem>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <AnimatedItem key={course.code} index={index} delay={0.2} direction="up" distance={20}>
              {course.available ? (
                <Link
                  href="/courses/math-151"
                  className={`p-6 rounded-2xl border transition-all duration-300 h-full flex flex-col bg-[#FFF8E5] border-[#FFBE00]/25 shadow-sm hover:border-[#FFBE00] cursor-pointer group`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#FFBE00]">
                      {course.code}
                    </span>
                    <span className="font-sans text-[10px] text-[#111111] bg-[#E5E5E5] px-2 py-1 rounded-md">
                      {course.status}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl mb-3 text-[#111111]">
                    {course.title}
                  </h3>
                  
                  <p className="font-sans text-sm text-[#666666] leading-relaxed flex-grow">
                    {course.description}
                  </p>

                  <div className="mt-8 font-sans text-xs font-semibold text-[#FFBE00] group-hover:translate-x-1 transition-transform">
                    Explore Course →
                  </div>
                </Link>
              ) : (
                <div 
                  className="p-6 rounded-2xl border transition-all duration-300 h-full flex flex-col bg-[#F4EEE8] border-[#E7D8C8] opacity-70"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#5D5149]">
                      {course.code}
                    </span>
                    <span className="font-sans text-[10px] text-[#111111] bg-[#E5E5E5] px-2 py-1 rounded-md">
                      {course.status}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl mb-3 text-[#666666]">
                    {course.title}
                  </h3>
                  
                  <p className="font-sans text-sm text-[#666666] leading-relaxed flex-grow">
                    {course.description}
                  </p>
                </div>
              )}
            </AnimatedItem>
          ))}
        </div>

      </div>
    </section>
  );
}
