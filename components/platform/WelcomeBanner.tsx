"use client";

import { useEffect, useState } from "react";
import { X, GraduationCap, Compass, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("first-principles-welcome-v1");
    if (!hasSeenWelcome) {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("first-principles-welcome-v1", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0, margin: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="mb-12 overflow-hidden rounded-[24px] bg-[#111111] text-white shadow-lg"
        >
          <div className="relative p-8 md:p-12 lg:p-16">
            <button
              onClick={dismiss}
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Dismiss welcome message"
            >
              <X size={16} />
            </button>

            <div className="max-w-4xl">
              <h2 className="mb-4 font-serif text-3xl font-medium tracking-tight md:text-4xl">
                Welcome to First Principles
              </h2>
              <p className="mb-10 font-sans text-lg text-[#A3A3A3] md:text-xl leading-relaxed">
                An open platform designed for structured, step-by-step mathematical reasoning.
                Start by exploring the complete MATH 151 curriculum below.
              </p>

              <div className="grid gap-8 md:grid-cols-3">
                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/20 text-[#60A5FA]">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-white">Interactive Lessons</h3>
                  <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                    Core concepts are broken down into logical steps alongside interactive visualizations.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/20 text-[#34D399]">
                    <Compass size={20} />
                  </div>
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-white">Guided Practice</h3>
                  <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                    Apply what you learn through immediate, low-stakes questions with detailed solutions.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C96B2D]/20 text-[#FDBA74]">
                    <GraduationCap size={20} />
                  </div>
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-white">Clear Progression</h3>
                  <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                    Follow the structured roadmap to ensure you master foundations before advancing.
                  </p>
                </div>
              </div>
              
              <div className="mt-10 border-t border-white/10 pt-6">
                <button
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#E5E5E5]"
                >
                  Explore Course Library
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
