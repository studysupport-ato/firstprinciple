"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedItem } from "@/components/motion/AnimatedItem";

export function TheIdea() {
  const sectionRef = useRef<HTMLElement>(null);
  
  useGSAP(
    () => {
      // Subtle background color shift on scroll
      gsap.to(sectionRef.current, {
        backgroundColor: "#F7F7F8", // color-muted
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top center",
          end: "bottom center",
          scrub: true,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="py-32 md:py-48 px-8 md:px-16 transition-colors duration-1000">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          
          {/* Left Column - Large Typography */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <AnimatedItem direction="up" distance={40}>
              <h2 className="editorial-heading text-4xl sm:text-5xl md:text-6xl text-[#111111] max-w-2xl">
                Memorization is fragile. <br/>
                <span className="text-[#666666] italic">Understanding is permanent.</span>
              </h2>
            </AnimatedItem>
            
            <AnimatedItem direction="up" distance={40} delay={0.2}>
              <p className="editorial-body mt-10 max-w-xl">
                The traditional university portal hands you a PDF and a deadline. We believe educational software should actually teach. 
              </p>
              <p className="editorial-body mt-6 max-w-xl">
                Back2Basics with Kwamina rebuilds the university curriculum from the ground up as a series of interactive, dimensional environments. You don't just read about mathematical concepts—you manipulate them.
              </p>
            </AnimatedItem>
          </div>

          {/* Right Column - Conceptual Diagram (Placeholder for interactive visual) */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <AnimatedItem direction="left" distance={60} delay={0.3} className="w-full max-w-md aspect-square rounded-2xl bg-white border border-[#E5E5E5] shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
              {/* Abstract representation of "Building from principles" */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,0.05),transparent_70%)]" />
              
              <div className="relative z-10 flex flex-col gap-6">
                <div className="w-48 h-[1px] bg-[#E5E5E5] relative">
                  <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-[#111111] -translate-y-1/2 transition-all duration-700 group-hover:left-full group-hover:-ml-2" />
                </div>
                <div className="w-48 h-[1px] bg-[#E5E5E5] relative">
                  <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-[#2563EB] -translate-y-1/2 transition-all duration-700 delay-100 group-hover:left-full group-hover:-ml-2" />
                </div>
                <div className="w-48 h-[1px] bg-[#E5E5E5] relative">
                  <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-[#E11D48] -translate-y-1/2 transition-all duration-700 delay-200 group-hover:left-full group-hover:-ml-2" />
                </div>
              </div>

              <p className="absolute bottom-6 left-6 text-xs font-mono uppercase tracking-widest text-[#666666]">
                Fig 1. Logical Progression
              </p>
            </AnimatedItem>
          </div>

        </div>
      </div>
    </section>
  );
}
