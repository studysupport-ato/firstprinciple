"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { TextReveal } from "@/components/motion/TextReveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const weeks = [
  {
    week: "01",
    title: "Real Number Theory",
    description: "Establishing the foundational axioms. Properties of real numbers, inequalities, and absolute values.",
  },
  {
    week: "02",
    title: "Functions & Polynomials",
    description: "Mappings, domain, range. Deep dive into quadratic and higher-degree polynomials and their roots.",
  },
  {
    week: "03",
    title: "Complex Numbers",
    description: "The imaginary unit. Argand diagrams, polar form, Euler's formula, and De Moivre's theorem.",
  },
  {
    week: "04",
    title: "Vector Algebra",
    description: "Spatial reasoning. Dot products, cross products, planes, and 3D geometry from first principles.",
  },
  {
    week: "05",
    title: "Matrices & Systems",
    description: "Linear transformations. Determinants, inverse matrices, and solving systems of linear equations.",
  },
];

export function CourseRoadmap() {
  const containerRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Animate the vertical line drawing down as you scroll
      gsap.fromTo(
        lineRef.current,
        { height: "0%" },
        {
          height: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 40%",
            end: "bottom 80%",
            scrub: true,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="py-32 bg-[#F7F7F8] relative">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        {/* Header */}
        <div className="mb-24 md:w-1/2">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4 block">
            The Curriculum
          </span>
          <TextReveal as="h2" type="lines" className="editorial-heading text-4xl sm:text-5xl">
            MATH 151: Algebra
          </TextReveal>
          <AnimatedItem delay={0.3}>
            <p className="editorial-body mt-6">
              Five weeks. Twenty-five teaching days. A highly structured progression designed to build compounding understanding rather than fragmented memorization.
            </p>
          </AnimatedItem>
        </div>

        {/* Timeline */}
        <div className="relative pl-8 md:pl-20">
          
          {/* The static background line */}
          <div className="absolute top-0 bottom-0 left-[9px] md:left-[39px] w-[2px] bg-[#E5E5E5]" />
          
          {/* The animated fill line */}
          <div 
            ref={lineRef}
            className="absolute top-0 left-[9px] md:left-[39px] w-[2px] bg-[#111111] origin-top"
          />

          <div className="flex flex-col gap-16 md:gap-24">
            {weeks.map((week, index) => (
              <AnimatedItem key={week.week} index={index} direction="left" distance={30} className="relative group">
                
                {/* Timeline Dot */}
                <div className="absolute top-2 -left-[45px] md:-left-[75px] w-4 h-4 rounded-full border-2 border-[#111111] bg-white transition-colors duration-500 group-hover:bg-[#111111]" />
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-12">
                  <div className="md:col-span-3 lg:col-span-2">
                    <span className="font-serif text-3xl md:text-4xl text-[#111111]">
                      {week.week}
                    </span>
                  </div>
                  <div className="md:col-span-9 lg:col-span-6 flex flex-col pt-1 md:pt-2">
                    <h3 className="font-sans font-semibold text-xl text-[#111111] mb-3">
                      {week.title}
                    </h3>
                    <p className="editorial-body text-base">
                      {week.description}
                    </p>
                  </div>
                </div>
                
              </AnimatedItem>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
