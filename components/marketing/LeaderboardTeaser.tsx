"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { Trophy, ArrowUp, Zap } from "lucide-react";

// Fixed data — we animate position via y offsets, not array reorder
const users = [
  { id: "1", name: "Abena Serwaa", xp: 14200, avatar: "A+S", isMe: false },
  { id: "2", name: "Emmanuel Ofori", xp: 13800, avatar: "E+O", isMe: false },
  { id: "3", name: "(You)", xp: 0, avatar: "K+M", isMe: true },
  { id: "4", name: "Ama Boateng", xp: 12100, avatar: "A+B", isMe: false },
];

const ROW_HEIGHT = 76; // px — height of each row + gap

export function LeaderboardTeaser() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });

  // Displayed XP (counts up)
  const [kwameXp, setKwameXp] = useState(0);
  // The y-translation for Kwame and Emmanuel (they swap)
  const [kwameY, setKwameY] = useState(0);
  const [emmanuelY, setEmmanuelY] = useState(0);
  // Glow state
  const [glowing, setGlowing] = useState(false);
  // Final rank order shown
  const [overtaken, setOvertaken] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    // Phase 1 (0.8s): Count up Kwame's XP
    const t1 = setTimeout(() => {
      setGlowing(true);
      const controls = animate(0, 13950, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate: (v) => setKwameXp(Math.round(v)),
      });

      // Phase 2 (2.2s): Slide Kwame up, Emmanuel down
      const t2 = setTimeout(() => {
        setKwameY(-ROW_HEIGHT);
        setEmmanuelY(ROW_HEIGHT);

        // Phase 3 (3.6s): Lock in overtaken state
        const t3 = setTimeout(() => {
          setOvertaken(true);
          setGlowing(false);
        }, 700);

        return () => clearTimeout(t3);
      }, 1400);

      return () => {
        controls.stop();
        clearTimeout(t2);
      };
    }, 800);

    return () => clearTimeout(t1);
  }, [isInView]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[#E5E5E5] bg-white py-32 text-[#111111]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#2563EB]/[0.06] blur-[150px]" />

      <div className="max-w-6xl mx-auto px-8 relative z-10 flex flex-col lg:flex-row items-center gap-16">

        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-1">
            <Trophy size={14} className="text-[#D97706]" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#666666]">
              Social Learning
            </span>
          </div>
          <h2 className="editorial-heading mb-6 text-4xl leading-tight text-[#111111] md:text-5xl lg:text-6xl">
            Climb the Ranks. <br />
            <span className="text-[#9CA3AF]">Own the Curve.</span>
          </h2>
          <p className="max-w-xl mx-auto font-sans text-lg leading-relaxed text-[#666666] lg:mx-0">
            Compete with thousands of KNUST freshers in real-time. Earn XP for every chapter mastered, every quiz aced, and every day you show up.
          </p>
        </motion.div>

        {/* Right: Live Leaderboard Widget */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="w-full rounded-3xl border border-[#263241] bg-[#0E1217] p-6 text-white shadow-[0_24px_60px_rgba(17,17,17,0.18)] backdrop-blur-md lg:w-[440px]"
        >
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-white/40">Class Rank</span>
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-white/40">XP</span>
          </div>

          {/* Fixed-height container — rows slide inside it */}
          <div className="relative" style={{ height: `${users.length * ROW_HEIGHT + 12}px` }}>
            {users.map((user, index) => {
              // Compute where this row sits vertically
              let yBase = index * ROW_HEIGHT;

              // When overtaken, lock the rendered positions
              let yTranslate = 0;
              if (!overtaken) {
                if (user.id === "3") yTranslate = kwameY;
                if (user.id === "2") yTranslate = emmanuelY;
              } else {
                // After overtake, Kwame is visually at slot 1 (index 1), Emmanuel at slot 2 (index 2)
                if (user.id === "3") yBase = 1 * ROW_HEIGHT;
                if (user.id === "2") yBase = 2 * ROW_HEIGHT;
              }

              const isKwame = user.id === "3";
              const isEmmanuel = user.id === "2";

              // Visual rank number — adjusts after overtake
              let rankNum = index + 1;
              if (overtaken) {
                if (isKwame) rankNum = 2;
                if (isEmmanuel) rankNum = 3;
              }

              return (
                <motion.div
                  key={user.id}
                  animate={{
                    y: yBase + yTranslate,
                    scale: isKwame && glowing ? 1.02 : 1,
                  }}
                  initial={{ y: yBase, opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    y: {
                      type: "spring",
                      stiffness: 200,
                      damping: 28,
                      mass: 0.8,
                    },
                    scale: { duration: 0.3 },
                    opacity: { delay: index * 0.1, duration: 0.5 },
                  }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-500 ${
                    isKwame && glowing
                      ? "bg-[#2563EB] border-blue-400 shadow-[0_0_40px_rgba(37,99,235,0.5)]"
                      : isKwame
                      ? "bg-white/10 border-white/20"
                      : "bg-transparent border-transparent"
                  }`}
                >
                  <span className="w-6 font-sans text-sm font-bold text-white/40 text-center flex-shrink-0">
                    {rankNum}
                  </span>

                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border border-white/20">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.avatar}&background=random&color=fff&size=100`}
                      alt=""
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`block font-sans font-bold truncate text-sm ${isKwame ? "text-white" : "text-white/80"}`}>
                      {user.name}
                    </span>
                    {isKwame && glowing && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-blue-200 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5"
                      >
                        <Zap size={9} /> +450 XP earned
                      </motion.span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-sans font-bold text-sm tabular-nums ${isKwame ? "text-white" : "text-white/60"}`}>
                      {isKwame ? kwameXp.toLocaleString() : user.xp.toLocaleString()}
                    </span>
                    {isKwame && (glowing || overtaken) && (
                      <ArrowUp size={14} className="text-blue-300" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
