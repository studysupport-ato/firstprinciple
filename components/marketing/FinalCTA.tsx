"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { TextReveal } from "@/components/motion/TextReveal";
import { motion } from "framer-motion";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

export function FinalCTA() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  const openAuth = (view: "signin" | "signup") => {
    setAuthView(view);
    setAuthOpen(true);
  };

  return (
    <>
      <section id="final-cta" className="relative py-40 flex flex-col items-center justify-center text-center overflow-hidden bg-[#111111]">
      
      {/* Background Image Texture (Bookending the site) */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1.0 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="w-full h-full"
        >
          <img 
            src="/hero-images/img4.jpg" 
            alt="Students studying"
            className="w-full h-full object-cover object-center opacity-30 grayscale mix-blend-luminosity"
            onError={(e) => {
              // Fallback if img4 doesn't exist or load properly
              e.currentTarget.src = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=85&w=2400&auto=format&fit=crop";
            }}
          />
        </motion.div>
        {/* Gradients to blend it into the dark background perfectly */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-[#111111]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-[0.02]" />
      </div>

      <div className="max-w-[1440px] mx-auto px-8 md:px-16 relative z-10 flex flex-col items-center">
        
        <AnimatedItem direction="up" distance={20}>
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-8 mx-auto shadow-2xl">
            <span className="text-[#111111] text-[18px] font-black tracking-tighter">B2</span>
          </div>
        </AnimatedItem>

        <div className="mb-12">
          <TextReveal as="h2" type="words" className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[100px] leading-[0.95] tracking-tight text-white max-w-5xl mx-auto">
            Your degree starts making sense.
          </TextReveal>
        </div>

        <AnimatedItem delay={0.6}>
          <p className="font-sans text-white/60 text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            Join the students learning mathematics the way it was always meant to be taught—from first principles.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => openAuth("signup")}
              className="h-14 rounded-full bg-white px-10 text-sm font-semibold text-[#111111] shadow-xl shadow-black/50 transition-all duration-300 hover:scale-105 hover:bg-[#FFBE00] hover:text-[#111111]"
            >
              Start Learning Free
            </button>
            <button
              type="button"
              onClick={() => openAuth("signin")}
              className="h-14 rounded-full border border-white/20 bg-transparent px-10 text-sm font-semibold text-white transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              View Syllabus
            </button>
          </div>
          
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-sans text-white/40 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/40" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/40" />
              KNUST & UG Curriculum
            </span>
          </div>
        </AnimatedItem>

      </div>
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
