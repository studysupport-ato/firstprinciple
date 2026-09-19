"use client";

import Link from "next/link";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { motion } from "framer-motion";

export function LessonExperience() {
  return (
    <section id="lesson-environment" className="py-32 bg-white overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Copy */}
          <div className="flex flex-col">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4">
              The Lesson Environment
            </span>
            <AnimatedItem>
              <h2 className="editorial-heading text-4xl sm:text-5xl mb-8 max-w-lg">
                Read, watch, <br />
                <span className="text-gradient-primary italic">and manipulate.</span>
              </h2>
            </AnimatedItem>
            
            <AnimatedItem delay={0.2}>
              <p className="editorial-body max-w-md mb-6">
                A lesson in Back2Basics with Kwamina is not a static wall of text. It is a structured sequence that breaks complex proofs into digestible, interactive steps.
              </p>
              <ul className="flex flex-col gap-4 mt-4">
                {[
                  "Step-by-step logical reveals",
                  "Inline mathematical visualization",
                  "Instant concept checks",
                  "Beautiful KaTeX typesetting"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    <span className="font-sans text-sm text-[#111111]">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedItem>
          </div>

          {/* Right Column - UI Mockup */}
          <AnimatedItem direction="left" distance={40} delay={0.3} className="relative w-full aspect-[4/3] max-w-[600px] mx-auto">
            {/* Ambient shadow/glow */}
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-4 rounded-3xl bg-[#2563EB]/5 blur-2xl"
            />
            
            {/* The mock UI window */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-xl"
            >
              
              {/* Header */}
              <motion.div
                initial={{ opacity: 0.7 }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-12 items-center border-b border-[#E5E5E5] bg-[#F7F7F8] px-4"
              >
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                </div>
                <div className="mx-auto font-sans text-[10px] font-medium text-[#666666]">
                  math-151 / complex-numbers / argand-plane
                </div>
              </motion.div>

              {/* Lesson Content Area */}
              <div className="flex-grow p-8 flex flex-col gap-6 relative">
                
                {/* Progress pill */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                  className="inline-flex self-start items-center gap-2 rounded-full bg-[#F7F7F8] px-3 py-1"
                >
                  <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [1, 0.65, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-2 w-2 rounded-full bg-[#059669]"
                  />
                  <span className="font-sans text-[10px] font-semibold text-[#111111]">STEP 3 OF 7</span>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.48 }}
                  className="font-serif text-2xl text-[#111111]"
                >
                  The Imaginary Unit
                </motion.h3>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.62 }}
                  className="font-sans text-sm leading-relaxed text-[#666666]"
                >
                  We define a new number <i className="font-serif text-[#2563EB]">i</i> such that its square is exactly negative one. This single definition expands the real number line into a two-dimensional plane.
                </motion.p>

                {/* Math Block (mock) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.78 }}
                  className="mt-2 flex items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-6"
                >
                  <motion.span
                    animate={{ y: [0, -2, 0], color: ["#111111", "#2563EB", "#111111"] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    className="font-serif text-xl tracking-widest"
                  >
                    <i className="text-[#2563EB]">i</i>² = -1
                  </motion.span>
                </motion.div>

                {/* Next Button */}
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="absolute bottom-6 right-6"
                >
                  <Link
                    href="/courses/math-151"
                    className="inline-flex items-center rounded-full bg-[#111111] px-5 py-2 text-xs font-medium text-white shadow-md transition-transform hover:scale-105"
                  >
                    Continue →
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatedItem>

        </div>
      </div>
    </section>
  );
}
