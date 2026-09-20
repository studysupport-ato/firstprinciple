"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { motion, AnimatePresence } from "framer-motion";
import { AuthModal } from "@/components/auth/AuthModal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// ─── IMAGE CONFIGURATION ────────────────────────────────────────────────────
// Drop your photos inside: /public/hero-images/
// Then replace the `url` values below with the filenames, e.g. "/hero-images/photo1.jpg"
// The Unsplash URLs below are fallbacks until you add your own images.
// ────────────────────────────────────────────────────────────────────────────

const slides = [
  {
    url: "/hero-images/img1.jpg",
    fallback: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=85&w=2400&auto=format&fit=crop",
    position: "center 40%",
  },
  {
    url: "/hero-images/img2.jpg",
    fallback: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=85&w=2400&auto=format&fit=crop",
    position: "center 35%",
  },
  {
    url: "/hero-images/img3.jpg",
    fallback: "https://images.unsplash.com/photo-1581726690015-c9861fa5057f?q=85&w=2400&auto=format&fit=crop",
    position: "center 50%",
  },
  {
    url: "/hero-images/img4.jpg",
    fallback: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=85&w=2400&auto=format&fit=crop",
    position: "center 45%",
  },
  {
    url: "/hero-images/img5.webp",
    fallback: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=85&w=2400&auto=format&fit=crop",
    position: "center 30%",
  },
];

const SLIDE_DURATION = 5000;

function SlideImage({ src, fallback, position }: { src: string; fallback: string; position: string }) {
  const [imgSrc, setImgSrc] = useState(src);

  // If local image fails to load, fall back to Unsplash
  const handleError = () => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt="Back2Basics with Kwamina campus"
      className="w-full h-full object-cover"
      style={{ objectPosition: position }}
      onError={handleError}
    />
  );
}

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  useGSAP(
    () => {
      if (!headingRef.current) return;

      const split = new SplitText(headingRef.current, {
        type: "words,lines",
        linesClass: "split-parent",
      });

      gsap.from(split.words, {
        yPercent: 110,
        opacity: 0,
        rotationZ: 1.5,
        duration: 1.4,
        ease: "power4.out",
        stagger: 0.07,
        delay: 0.8,
      });

      gsap.to(".hero-content", {
        yPercent: 25,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      return () => split.revert();
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100svh] min-h-[500px] flex items-end justify-start overflow-hidden bg-[#111111]"
    >
      {/* ── SLIDESHOW BACKGROUND ── */}
      <AnimatePresence mode="sync">
        {slides.map((slide, idx) =>
          idx === currentSlide ? (
            <motion.div
              key={idx}
              className="absolute inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            >
              {/* Ken Burns slow zoom */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1.0 }}
                transition={{ duration: SLIDE_DURATION / 1000 + 1.5, ease: "linear" }}
              >
                <SlideImage src={slide.url} fallback={slide.fallback} position={slide.position} />
              </motion.div>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      {/* ── OVERLAYS ── */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-y-0 left-0 z-10 w-full max-w-[760px] bg-[radial-gradient(ellipse_at_20%_70%,rgba(0,0,0,0.46),transparent_72%)]" />

      {/* ── HERO CONTENT ── */}
      <div className="hero-content relative z-20 w-full max-w-[1440px] mx-auto px-8 md:px-16 pb-10 md:pb-14 lg:pb-16 flex flex-col items-start">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-5 flex items-center gap-3"
        >
          <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
            <span className="text-[#111111] text-[8px] font-black">B2</span>
          </div>
          <span className="font-sans text-[11px] tracking-[0.22em] uppercase text-white/70 font-semibold">
            BACK2BASICS WITH KWAMINA · MATH 151
          </span>
        </motion.div>

        <h1
          ref={headingRef}
          className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[72px] xl:text-[84px] leading-[1.0] tracking-tight text-white max-w-5xl mb-6"
        >
          University mathematics, finally taught well.
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.6 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
        >
          <button
            type="button"
            onClick={() => {
              setAuthView("signup");
              setAuthOpen(true);
            }}
            className="h-12 px-8 bg-white text-[#1A1714] rounded-full text-sm font-semibold hover:bg-[#C96B2D] hover:text-white hover:scale-105 transition-all duration-300 shadow-lg shadow-black/20"
          >
            Get Started
          </button>
          <p className="font-sans text-sm text-white/60 max-w-xs leading-relaxed">
            Interactive lessons, worked examples, and guided practice built around MATH 151
          </p>
        </motion.div>

      </div>

      {/* ── SLIDE INDICATORS ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 right-8 md:right-16 z-20 flex items-center gap-3"
      >
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className="relative h-[2px] overflow-hidden transition-all duration-500"
            style={{ width: idx === currentSlide ? "40px" : "16px" }}
            aria-label={`Go to slide ${idx + 1}`}
          >
            <div className="absolute inset-0 bg-white/30 rounded-full" />
            {idx === currentSlide && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                key={currentSlide}
              />
            )}
          </button>
        ))}
      </motion.div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />

      {/* ── SCROLL INDICATOR ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
      >
        <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/40">Scroll</span>
        <div className="w-[1px] h-10 bg-gradient-to-b from-white/40 to-transparent" />
      </motion.div>

    </section>
  );
}
