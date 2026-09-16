"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedItem } from "@/components/motion/AnimatedItem";

const numberSets = [
  {
    id: "N",
    name: "Natural Numbers",
    symbol: "ℕ",
    description: "The counting numbers. 1, 2, 3, 4...",
    color: "#059669", // Math accent 2 (Green)
    size: 25,
  },
  {
    id: "Z",
    name: "Integers",
    symbol: "ℤ",
    description: "Natural numbers, their negatives, and zero.",
    color: "#2563EB", // Interactive Blue
    size: 50,
  },
  {
    id: "Q",
    name: "Rational Numbers",
    symbol: "ℚ",
    description: "Fractions of integers. p/q where q ≠ 0.",
    color: "#4F46E5", // Math accent 4 (Indigo)
    size: 75,
  },
  {
    id: "R",
    name: "Real Numbers",
    symbol: "ℝ",
    description: "All rational and irrational numbers. The continuous number line.",
    color: "#E11D48", // Math accent 1 (Rose)
    size: 100,
  },
];

export function InteractiveDemo() {
  const [activeSet, setActiveSet] = useState<string>("R");

  useEffect(() => {
    const cycle = window.setInterval(() => {
      setActiveSet((current) => {
        const currentIndex = numberSets.findIndex((set) => set.id === current);
        return numberSets[(currentIndex + 3) % numberSets.length].id;
      });
    }, 4200);

    return () => window.clearInterval(cycle);
  }, []);

  return (
    <section className="py-32 bg-white border-t border-[#E5E5E5] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        {/* Header */}
        <AnimatedItem className="mb-24 flex flex-col items-center text-center">
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4">
            Interactive Systems
          </span>
          <h2 className="editorial-heading text-4xl sm:text-5xl max-w-2xl">
            See the structure. <br />
            <span className="text-[#666666] italic">Don't just read the definition.</span>
          </h2>
        </AnimatedItem>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Interactive Graphic */}
          <AnimatedItem direction="right" className="relative aspect-square max-w-[600px] mx-auto w-full flex items-center justify-center p-8">
            {/* We render from R down to N, so N is on top */}
            {[...numberSets].reverse().map((set, index) => {
              const isActive = activeSet === set.id;
              const isHoveredOrActive = activeSet === set.id; // Could add hover state logic here

              return (
                <motion.div
                  key={set.id}
                  onClick={() => setActiveSet(set.id)}
                  className="absolute rounded-full border-[1.5px] cursor-pointer flex items-end justify-center pb-8 lg:pb-12 transition-colors duration-500"
                  initial={{ opacity: 0, scale: 0.72 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.45 }}
                  style={{
                    width: `${set.size}%`,
                    height: `${set.size}%`,
                    borderColor: isActive ? set.color : "#E5E5E5",
                    backgroundColor: isActive ? `${set.color}08` : "transparent",
                    zIndex: 10 - index,
                  }}
                  animate={isActive ? { scale: [1, 1.018, 1], opacity: [1, 0.92, 1] } : { scale: 1, opacity: 1 }}
                  transition={isActive
                    ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  layout
                >
                  <motion.span
                    animate={isActive ? { y: [0, -3, 0] } : { y: 0 }}
                    transition={isActive ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                    className="font-serif text-2xl transition-colors duration-300 lg:text-3xl"
                    style={{ color: isActive ? set.color : "#111111" }}
                  >
                    {set.symbol}
                  </motion.span>
                </motion.div>
              );
            })}
          </AnimatedItem>

          {/* Explanation Panel */}
          <div className="flex flex-col justify-center lg:pl-16">
            <AnimatedItem delay={0.2}>
              <div className="min-h-[200px]">
                <AnimatePresence mode="wait">
                  {numberSets.map((set) => (
                    activeSet === set.id && (
                      <motion.div
                        key={set.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <h3 
                          className="font-serif text-5xl mb-2"
                          style={{ color: set.color }}
                        >
                          {set.symbol}
                        </h3>
                        <h4 className="font-sans font-medium text-lg text-[#111111] mb-4">
                          {set.name}
                        </h4>
                        <p className="editorial-body text-[#666666]">
                          {set.description}
                        </p>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>

              {/* Set Navigation */}
              <div className="mt-12 flex flex-col gap-2">
                <span className="text-xs font-sans font-semibold text-[#111111] uppercase tracking-wider mb-2">
                  Explore Sets
                </span>
                <div className="flex flex-wrap gap-2">
                  {numberSets.map((set) => (
                    <button
                      key={set.id}
                      onClick={() => setActiveSet(set.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                        activeSet === set.id 
                          ? "bg-white shadow-sm" 
                          : "bg-transparent border-transparent text-[#666666] hover:bg-[#F7F7F8]"
                      }`}
                      style={{
                        borderColor: activeSet === set.id ? set.color : "transparent",
                        color: activeSet === set.id ? set.color : "",
                      }}
                    >
                      {set.symbol} — {set.name}
                    </button>
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
