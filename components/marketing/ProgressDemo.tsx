"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedItem } from "@/components/motion/AnimatedItem";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { label: "Course Mastery", value: "84", suffix: "%", color: "#059669" },
  { label: "Active Streak", value: "12", suffix: " days", color: "#2563EB" },
  { label: "Problems Solved", value: "342", suffix: "", color: "#E11D48" },
];

export function ProgressDemo() {
  const containerRef = useRef<HTMLElement>(null);
  const countersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      // Counter Animation
      countersRef.current.forEach((counter, i) => {
        if (!counter) return;
        const targetValue = parseInt(stats[i].value, 10);
        
        gsap.fromTo(
          counter,
          { innerText: 0 },
          {
            innerText: targetValue,
            duration: 2,
            ease: "power3.out",
            snap: { innerText: 1 },
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 60%",
            },
            onUpdate: function () {
              counter.innerText = Math.round(Number(this.targets()[0].innerText)).toString();
            },
          }
        );
      });

      // Progress Bar Animation
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const targetWidth = bar.getAttribute("data-width") || "0%";
        
        gsap.fromTo(
          bar,
          { width: "0%" },
          {
            width: targetWidth,
            duration: 1.5,
            ease: "power3.out",
            delay: i * 0.1,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 60%",
            },
          }
        );
      });
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="py-32 bg-white border-t border-[#E5E5E5] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          
          {/* Left Column - Copy */}
          <div className="lg:col-span-5 flex flex-col">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4">
              Student Progress
            </span>
            <AnimatedItem>
              <h2 className="editorial-heading text-4xl sm:text-5xl mb-8">
                Measurement that <br />
                <span className="text-gradient-primary italic">actually matters.</span>
              </h2>
            </AnimatedItem>
            
            <AnimatedItem delay={0.2}>
              <p className="editorial-body max-w-md">
                We abandon the arbitrary grading scales of traditional LMS platforms. Progress in Back2Basics with Kwamina is a direct reflection of conceptual mastery and consistent practice.
              </p>
            </AnimatedItem>
          </div>

          {/* Right Column - Dashboard Mockup */}
          <div className="lg:col-span-7 flex flex-col gap-6 w-full max-w-[700px] mx-auto lg:mx-0">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <AnimatedItem key={stat.label} index={i} direction="up" distance={20}>
                  <div className="p-6 bg-[#F7F7F8] border border-[#E5E5E5] rounded-2xl flex flex-col">
                    <span className="font-sans text-[10px] font-semibold tracking-wider text-[#666666] uppercase mb-4">
                      {stat.label}
                    </span>
                    <div className="flex items-baseline gap-1" style={{ color: stat.color }}>
                      <span 
                        ref={(el) => { countersRef.current[i] = el; }} 
                        className="font-serif text-5xl tracking-tight"
                      >
                        0
                      </span>
                      <span className="font-sans text-lg font-medium">{stat.suffix}</span>
                    </div>
                  </div>
                </AnimatedItem>
              ))}
            </div>

            {/* Bottom Progress Block */}
            <AnimatedItem delay={0.4} direction="up" distance={20}>
              <div className="p-8 bg-white border border-[#E5E5E5] shadow-sm rounded-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl text-[#111111]">MATH 151 Completion</h4>
                  <span className="font-sans text-sm text-[#666666]">Week 4 of 5</span>
                </div>

                <div className="flex flex-col gap-4">
                  {[
                    { label: "Real Number Theory", pct: "100%", color: "#111111" },
                    { label: "Functions & Polynomials", pct: "100%", color: "#111111" },
                    { label: "Complex Numbers", pct: "84%", color: "#2563EB" },
                    { label: "Vector Algebra", pct: "12%", color: "#666666" }
                  ].map((item, i) => (
                    <div key={item.label} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between font-sans text-xs">
                        <span className="text-[#111111] font-medium">{item.label}</span>
                        <span className="text-[#666666]">{item.pct}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F7F7F8] rounded-full overflow-hidden">
                        <div 
                          ref={(el) => { barsRef.current[i] = el; }}
                          data-width={item.pct}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color, width: "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedItem>

          </div>

        </div>
      </div>
    </section>
  );
}
