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
          className="fixed inset-y-0 right-0 left-0 md:left-20 z-40 flex items-center justify-center bg-[#FAFAFA] p-4 md:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[850px] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[24px] bg-[#FFBE00] text-[#111111] border-4 border-[#111111] shadow-[8px_8px_0_#E53935] relative scrollbar-hide"
          >
            {/* Faint grid background overlay like StudySync */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            <div className="relative p-8 md:p-10 lg:p-12">
              <button
                onClick={dismiss}
                className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#111111]/10 text-[#111111]/70 transition-colors hover:bg-[#111111]/20 hover:text-[#111111]"
                aria-label="Dismiss welcome message"
              >
                <X size={18} />
              </button>

              <div className="max-w-3xl">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mb-3 font-sans text-4xl font-black tracking-tight md:text-5xl uppercase"
                >
                  Welcome to <span className="text-[#E53935]">First Principles</span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mb-10 font-sans text-lg text-[#111111]/80 font-medium md:text-xl leading-relaxed max-w-2xl"
                >
                  The unified academic platform students deserve — structured reasoning, real-time progression, and a foundation built for excellence.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="grid gap-6 md:grid-cols-3"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111111] text-[#FFBE00] border-2 border-[#E53935]">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-black uppercase tracking-widest text-[#111111]">Interactive Lessons</h3>
                    <p className="font-sans text-sm font-medium leading-relaxed text-[#111111]/70">
                      Core concepts are broken down into logical steps alongside interactive visualizations.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111111] text-[#FFBE00] border-2 border-[#E53935]">
                      <Compass size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-black uppercase tracking-widest text-[#111111]">Guided Practice</h3>
                    <p className="font-sans text-sm font-medium leading-relaxed text-[#111111]/70">
                      Apply what you learn through immediate, low-stakes questions with detailed solutions.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111111] text-[#FFBE00] border-2 border-[#E53935]">
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-sans text-xs font-black uppercase tracking-widest text-[#111111]">Clear Progression</h3>
                    <p className="font-sans text-sm font-medium leading-relaxed text-[#111111]/70">
                      Follow the structured roadmap to ensure you master foundations before advancing.
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="mt-10 border-t-2 border-[#111111]/10 pt-8"
                >
                  <button
                    onClick={dismiss}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#111111] px-8 text-sm font-black uppercase tracking-wide text-[#FFBE00] border-2 border-[#111111] shadow-[4px_4px_0_#E53935] transition-all hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_#E53935] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
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
