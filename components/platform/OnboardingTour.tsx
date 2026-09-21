"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuthSession } from "@/lib/auth/useAuthSession";

const TOUR_KEY = "first-principles-onboarding-v1";

const STEPS = [
  {
    targetId: "courses",
    heading: "Courses",
    text: "Your main learning space. Find your courses and continue your learning journey here.",
  },
  {
    targetId: "course-materials",
    heading: "Course Materials",
    text: "Find supporting course materials and useful academic resources.",
  },
  {
    targetId: "questions",
    heading: "Questions",
    text: "Use this area to practice and test your understanding.",
  },
  {
    targetId: "settings",
    heading: "Settings",
    text: "Manage your profile and preferences here.",
  },
];

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const pathname = usePathname();
  const { authenticated, student } = useAuthSession();
  const prefersReducedMotion = useReducedMotion();
  
  const transitionProps = prefersReducedMotion 
    ? { duration: 0 } 
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

  useEffect(() => {
    // Only check on the client
    const currentTourKey = student ? `${TOUR_KEY}:${student.studentId}` : TOUR_KEY;
    const isCompleted = localStorage.getItem(currentTourKey) === "true";
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get("preview") === "1";
    const wantsOnboarding = urlParams.get("onboarding") === "true";
    const isAdmin = pathname.startsWith("/admin");
    
    // Only start on /courses, when authenticated or explicitly requested, not completed, not preview, not admin
    if (
      pathname === "/courses" &&
      (authenticated === true || wantsOnboarding) &&
      !isCompleted &&
      !isPreview &&
      !isAdmin
    ) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Clean up the URL if we used the onboarding param
        if (wantsOnboarding) {
          window.history.replaceState(null, '', pathname);
        }
      }, 800); // subtle delay
      return () => clearTimeout(timer);
    }
  }, [pathname, authenticated, student]);

  const step = STEPS[currentStep];

  const updateTargetRect = () => {
    if (!isVisible) return;
    const element = document.querySelector(`[data-tour="${step.targetId}"]`);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isVisible) {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
      updateTargetRect();
      const handleResize = () => {
        setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        updateTargetRect();
      };
      const handleScroll = () => updateTargetRect();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isVisible, currentStep]);

  if (!isVisible) return null;

  const handleSkip = () => {
    const currentTourKey = student ? `${TOUR_KEY}:${student.studentId}` : TOUR_KEY;
    localStorage.setItem(currentTourKey, "true");
    setIsVisible(false);
  };


  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      handleSkip(); // Finish
    }
  };

  // Calculate card position (place it to the right of the sidebar item, or above/below on mobile)
  let cardTop = 0;
  let cardLeft = 0;
  
  if (targetRect) {
    const isMobile = windowSize.w < 768; // Tailwind md breakpoint
    if (isMobile) {
      // On mobile, assuming a bottom or hidden nav, we just center it or place it near
      cardTop = targetRect.bottom + 16;
      cardLeft = 16;
      if (cardTop + 200 > windowSize.h) {
        cardTop = targetRect.top - 200 - 16;
      }
    } else {
      cardTop = targetRect.top;
      cardLeft = targetRect.right + 20;
      
      // Prevent card from overflowing off the bottom of the screen
      const estimatedCardHeight = 220;
      if (cardTop + estimatedCardHeight > windowSize.h) {
        cardTop = Math.max(16, windowSize.h - estimatedCardHeight - 24);
      }
    }
  }

  // Fallback if target is somehow not found
  if (!targetRect) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {/* Overlay with a hole cutout */}
          <motion.div
            className="absolute bg-transparent rounded-2xl pointer-events-auto shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            exit={{ opacity: 0 }}
            transition={transitionProps}
          />

          {/* Glowing ring around the target */}
          <motion.div
            className="absolute rounded-2xl border-2 border-[#C96B2D]/60 shadow-[0_0_20px_rgba(201,107,45,0.4)] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            exit={{ opacity: 0 }}
            transition={transitionProps}
          />

          {/* Explanation Card */}
          <motion.div
            className="absolute w-[280px] md:w-[320px] bg-white rounded-2xl p-5 shadow-[0_20px_40px_rgba(17,17,17,0.12)] border border-[#E5E5E5] pointer-events-auto flex flex-col gap-3"
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, top: cardTop, left: cardLeft, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            transition={transitionProps}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C96B2D]">
                {String(currentStep + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </span>
            </div>
            <h3 className="font-serif text-lg font-medium text-[#111111]">
              {step.heading}
            </h3>
            <p className="font-sans text-sm text-[#666666] leading-relaxed">
              {step.text}
            </p>
            
            <div className="mt-2 flex items-center justify-between pt-4 border-t border-[#F7F7F8]">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-sans font-medium text-[#999999] hover:text-[#111111] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C96B2D] rounded-md px-2 py-1 -ml-2"
              >
                Skip tour
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#111111] hover:bg-[#C96B2D] text-white text-xs font-sans font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C96B2D]"
              >
                {currentStep === STEPS.length - 1 ? "Finish" : "Continue"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
