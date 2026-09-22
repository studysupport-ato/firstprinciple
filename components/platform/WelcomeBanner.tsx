"use client";

import { useEffect, useState } from "react";
import { X, GraduationCap, Compass, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasSeenWelcome = localStorage.getItem("first-principles-welcome-v1");
    if (!hasSeenWelcome) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("first-principles-welcome-v1", "true");
    setIsVisible(false);
    document.body.style.overflow = "auto";
    
    // Dispatch event to layout to trigger sidebar slide-in
    setTimeout(() => {
      window.dispatchEvent(new Event("welcome-dismissed"));
    }, 100);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-y-0 right-0 left-0 md:left-20 z-40 flex items-center justify-center bg-transparent p-4 md:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[850px] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[24px] bg-[#111111] text-white shadow-2xl relative scrollbar-hide"
          >
            <div className="relative p-8 md:p-10 lg:p-12">
              <button
                onClick={dismiss}
                className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Dismiss welcome message"
              >
                <X size={18} />
              </button>

              <div className="max-w-3xl">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mb-3 font-serif text-3xl font-medium tracking-tight md:text-4xl"
                >
                  Welcome to First Principles
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mb-10 font-sans text-lg text-[#A3A3A3] md:text-xl leading-relaxed max-w-2xl"
                >
                  An open platform designed for structured, step-by-step mathematical reasoning.
                  Start by exploring the complete MATH 151 curriculum below.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="grid gap-6 md:grid-cols-3"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFBE00]/20 text-[#E5AA00]">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-white">Interactive Lessons</h3>
                    <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                      Core concepts are broken down into logical steps alongside interactive visualizations.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/20 text-[#34D399]">
                      <Compass size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-white">Guided Practice</h3>
                    <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                      Apply what you learn through immediate, low-stakes questions with detailed solutions.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFBE00]/20 text-[#FFBE00]">
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-white">Clear Progression</h3>
                    <p className="font-sans text-sm leading-relaxed text-[#A3A3A3]">
                      Follow the structured roadmap to ensure you master foundations before advancing.
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="mt-10 border-t border-white/10 pt-6"
                >
                  <button
                    onClick={dismiss}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#FFBE00] px-7 text-sm font-bold text-[#111111] transition-all hover:scale-105 hover:bg-[#E5AA00] shadow-[0_0_20px_rgba(255,190,0,0.3)]"
                  >
                    Explore Course Library
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
