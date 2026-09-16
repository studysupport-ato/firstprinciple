"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";

// ── UTILS ──────────────────────────────────────────────────────────────────────

function MathText({ math, block = false }: { math: string; block?: boolean }) {
  return (
    <span 
      className={`font-serif italic ${block ? "block text-center my-4 text-lg" : "inline"}`}
      dangerouslySetInnerHTML={{ __html: math }}
    />
  );
}

// ── 3D SCENES ──────────────────────────────────────────────────────────────────

function NestedSetsScene({ buildStep }: { buildStep: number }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.getElapsedTime() * 0.05;
      group.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.05 + 0.1;
    }
  });

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* N - Naturals */}
      <mesh position={[-1, 0.2, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 64]} />
        <meshStandardMaterial color="#FEF3C7" transparent opacity={buildStep >= 0 ? 1 : 0} />
      </mesh>
      {buildStep >= 0 && (
        <Html position={[-1, 0.6, 0]} center>
          <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            ℕ : Natural (1, 2, 3...)
          </div>
        </Html>
      )}

      {/* Z - Integers */}
      <mesh position={[-0.8, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.3, 64]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={buildStep >= 1 ? 0.9 : 0} />
      </mesh>
      {buildStep >= 1 && (
        <Html position={[-1.8, 0, 0]} center>
          <div className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            ℤ : Integers (+ 0, negatives)
          </div>
        </Html>
      )}
      
      {/* Q - Rationals */}
      <mesh position={[-0.5, -0.2, 0]}>
        <cylinderGeometry args={[2, 2, 0.2, 64]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={buildStep >= 2 ? 0.8 : 0} />
      </mesh>
      {buildStep >= 2 && (
        <Html position={[-2.2, -0.2, 1]} center>
          <div className="bg-sky-100 text-sky-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            ℚ : Rationals (Fractions)
          </div>
        </Html>
      )}

      {/* I - Irrationals */}
      <mesh position={[2, -0.2, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.2, 64]} />
        <meshStandardMaterial color="#FEE2E2" transparent opacity={buildStep >= 3 ? 0.9 : 0} />
      </mesh>
      {buildStep >= 3 && (
        <Html position={[2, 0.2, 0]} center>
          <div className="bg-rose-100 text-rose-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
            𝕀 : Irrationals (√2, π)
          </div>
        </Html>
      )}
      
      {/* R - Real Numbers (Base) */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 0.1, 64]} />
        <meshStandardMaterial color="#F8FAFC" transparent opacity={buildStep >= 4 ? 0.6 : 0} />
      </mesh>
      {buildStep >= 4 && (
        <Html position={[0, -0.5, 3.3]} center>
          <div className="bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded text-xs font-bold shadow-sm whitespace-nowrap">
            ℝ : Real Numbers (ℚ ∪ 𝕀)
          </div>
        </Html>
      )}
    </group>
  );
}

function EducationalDominos() {
  const dominosCount = 15;
  const dominos = useRef<THREE.Group[]>([]);
  const [falling, setFalling] = useState(false);
  const startTime = useRef(0);

  const triggerFall = () => {
    setFalling(true);
    startTime.current = performance.now();
  };

  const resetFall = () => {
    setFalling(false);
    dominos.current.forEach(d => { if (d) d.rotation.z = 0; });
  };

  useFrame(() => {
    if (falling) {
      const elapsed = (performance.now() - startTime.current) / 1000;
      dominos.current.forEach((domino, i) => {
        if (!domino) return;
        const delay = i * 0.15; 
        if (elapsed > delay) {
          domino.rotation.z = THREE.MathUtils.lerp(domino.rotation.z, -Math.PI / 2.2, 0.1);
        }
      });
    }
  });

  return (
    <group position={[3, -1, -2]} rotation={[0, -Math.PI/4, 0]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      
      <mesh position={[-5, -0.05, 0]}>
        <boxGeometry args={[14, 0.1, 2]} />
        <meshStandardMaterial color="#F8FAFC" />
      </mesh>

      {Array.from({ length: dominosCount }).map((_, i) => (
        <group key={i} position={[-i * 0.8, 0, 0]} ref={(el) => { if (el) dominos.current[i] = el; }}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.2, 1.2, 0.6]} />
            <meshStandardMaterial color={i === 0 ? "#10B981" : (i === 4 ? "#F59E0B" : (i === 5 ? "#EF4444" : "#2563EB"))} />
          </mesh>
          
          {/* Labels for educational context */}
          {i === 0 && (
            <Html position={[0, 1.5, 0]} center>
              <div className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                Base Case (n=1)
              </div>
            </Html>
          )}
          {i === 4 && (
            <Html position={[0, 1.5, 0]} center>
              <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                Assume for n=k
              </div>
            </Html>
          )}
          {i === 5 && (
            <Html position={[0, 1.5, 0]} center>
              <div className="bg-rose-100 text-rose-800 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-sm">
                Prove for n=k+1
              </div>
            </Html>
          )}
        </group>
      ))}

      <Html position={[-4, -1.5, 0]} center>
        <div className="flex gap-2">
          <button onClick={triggerFall} className="bg-[#111111] text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#2563EB] transition-colors">
            Trigger Proof
          </button>
          <button onClick={resetFall} className="bg-white border border-[#E5E5E5] text-[#111111] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#F7F7F8] transition-colors">
            Reset
          </button>
        </div>
      </Html>
    </group>
  );
}

// ── UI COMPONENTS ──────────────────────────────────────────────────────────────

function FlipCard({ front, backTitle, backContent }: { front: string, backTitle: string, backContent: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative w-full h-32 cursor-pointer perspective-1000" onClick={() => setFlipped(!flipped)}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full h-full relative preserve-3d"
      >
        <div className="absolute inset-0 backface-hidden bg-white border border-[#E5E5E5] rounded-xl flex flex-col items-center justify-center p-4 hover:border-[#111111]/30 transition-colors shadow-sm">
          <span className="font-serif text-3xl text-[#111111] mb-1">{front}</span>
          <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-[#666666]">tap to flip</span>
        </div>
        <div className="absolute inset-0 backface-hidden bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-center" style={{ transform: "rotateY(180deg)" }}>
          <h4 className="font-sans font-bold text-xs mb-1 text-[#0F172A]">{backTitle}</h4>
          <p className="font-sans text-[10px] text-[#475569] leading-relaxed">{backContent}</p>
        </div>
      </motion.div>
    </div>
  );
}

function WorkedExample({ title, caseNum, children }: { title: string, caseNum: number, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-4 flex items-center justify-between bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors">
        <span className="font-sans font-semibold text-sm text-[#1E293B]">Case {caseNum} · {title}</span>
        <ChevronDown size={16} className={`text-[#64748b] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-6 bg-white border-t border-[#E5E5E5] text-sm text-[#475569] font-mono">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PracticeExercise({ num, text, hint, solution, badge }: { num: number, text: string, hint: string, solution: React.ReactNode, badge: string }) {
  const [showSolution, setShowSolution] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className={`bg-white border rounded-2xl p-6 mb-4 transition-colors ${done ? "border-[#10B981] bg-[#ECFDF5]" : "border-[#E5E5E5]"}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="font-serif text-2xl font-bold text-[#1E293B]">{num}</span>
        <span className={`font-sans text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${done ? "bg-[#10B981] text-white" : "bg-[#F1F5F9] text-[#64748b]"}`}>
          {badge}
        </span>
      </div>
      <p className="font-sans text-sm text-[#1E293B] mb-6"><MathText math={text} /></p>
      
      <div className="flex gap-3 items-center">
        <button onClick={() => setShowSolution(!showSolution)} className="bg-[#1E293B] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#334155] transition-colors">
          {showSolution ? "Hide Solution" : "Full solution"}
        </button>
        <button className="bg-white border border-[#E2E8F0] text-[#475569] px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#F8FAFC] transition-colors">
          Hint
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={done} onChange={() => setDone(!done)} className="w-4 h-4 rounded border-[#CBD5E1] text-[#10B981] focus:ring-[#10B981]" />
          <span className="font-sans text-xs text-[#64748b]">mark done</span>
        </label>
      </div>

      <AnimatePresence>
        {showSolution && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-6">
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] font-mono text-xs text-[#475569] overflow-x-auto">
              {solution}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function IntroLessonPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [step, setStep] = useState(0);
  const [buildStep, setBuildStep] = useState(-1);

  // Auto-build the sets in step 0
  useEffect(() => {
    if (step === 0) {
      setBuildStep(-1);
      const timers = [
        setTimeout(() => setBuildStep(0), 500),
        setTimeout(() => setBuildStep(1), 1500),
        setTimeout(() => setBuildStep(2), 2500),
        setTimeout(() => setBuildStep(3), 3500),
        setTimeout(() => setBuildStep(4), 4500),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [step]);

  const steps = [
    {
      id: 0,
      title: "Real Numbers",
      content: (
        <div className="flex flex-col gap-6 pb-12">
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            Before a civil engineering fresher at KNUST trusts a beam calculation, something has to guarantee that arithmetic actually behaves the way we assume it does. That guarantee is what this chapter builds — and induction is the tool that makes it rigorous instead of just "obvious."
          </p>
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            Every number system you've used since primary school was invented to solve an equation the previous system couldn't. <MathText math="ℝ" /> splits cleanly into two non-overlapping pieces: the rationals <MathText math="ℚ" /> (which nest <MathText math="ℤ" />, which nests <MathText math="ℕ" />) and the irrationals <MathText math="𝕀" />.
          </p>
          <p className="font-sans text-xs font-semibold text-[#2563EB]">Watch the 3D diagram build the sets →</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <FlipCard front="ℕ" backTitle="Natural numbers" backContent="{1, 2, 3...} Closed under + and ×." />
            <FlipCard front="ℤ" backTitle="Integers" backContent="{..., -1, 0, 1...} Closed under -." />
            <FlipCard front="ℚ" backTitle="Rational numbers" backContent="Fractions a/b. Terminate or repeat." />
            <FlipCard front="𝕀" backTitle="Irrational numbers" backContent="√2, π. Infinite non-repeating." />
          </div>

          <div className="mt-8">
            <h3 className="editorial-heading text-xl text-[#111111] mb-4">Properties you'll quote without proof from now on</h3>
            <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">Law</th>
                    <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">Statement</th>
                    <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">Holds For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] font-sans text-xs">
                  <tr>
                    <td className="px-4 py-3 font-semibold">Closure</td>
                    <td className="px-4 py-3">a + b and a·b are always in the same set</td>
                    <td className="px-4 py-3 text-[#64748b]">N, Z, Q, R</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Commutativity</td>
                    <td className="px-4 py-3">a + b = b + a, ab = ba</td>
                    <td className="px-4 py-3 text-[#64748b]">N, Z, Q, R</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Associativity</td>
                    <td className="px-4 py-3">(a+b)+c = a+(b+c), (ab)c = a(bc)</td>
                    <td className="px-4 py-3 text-[#64748b]">N, Z, Q, R</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Distributivity</td>
                    <td className="px-4 py-3">a(b+c) = ab + ac</td>
                    <td className="px-4 py-3 text-[#64748b]">N, Z, Q, R</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Trichotomy</td>
                    <td className="px-4 py-3">exactly one of a{'>'}b, a{'<'}b, a=b holds</td>
                    <td className="px-4 py-3 text-[#64748b]">Z, Q, R</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Cancellation</td>
                    <td className="px-4 py-3">if a·c = b·c and c ≠ 0, then a = b</td>
                    <td className="px-4 py-3 text-[#64748b]">Z, Q, R</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "1.2 · The Principle of Mathematical Induction",
      content: (
        <div className="flex flex-col gap-6 pb-12">
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            Every worked example in §1.5 of the source text asks you to prove a statement true for <em>every</em> positive integer — infinitely many cases. You obviously can't check them one by one. 
            <br/><br/>
            Induction is a two-step trick that lets a proof about n = 1 and a proof about "one step forward" cover all of them at once.
          </p>
          <p className="font-sans text-xs font-semibold text-[#2563EB]">Trigger the proof in the 3D viewer to see the domino effect →</p>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 mt-4 text-center">
            <p className="font-sans text-sm text-[#475569] italic">
              Knock down domino 1 (the base case), and show any falling domino knocks over the next one (the inductive step) — every domino in the infinite line falls. That's induction.
            </p>
          </div>

          <h3 className="editorial-heading text-xl text-[#111111] mt-6 mb-2">The 4-step framework</h3>
          <div className="flex flex-col gap-0 border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
            {[
              { num: 1, title: "Prove the base case", desc: "Show the statement holds for n = 1 (or whatever starting integer n₀ the problem specifies)." },
              { num: 2, title: "State the inductive hypothesis", desc: "Assume the statement is true for n = k, some arbitrary integer ≥ the base case. You're not proving this — you're allowed to assume it." },
              { num: 3, title: "Prove the inductive step", desc: "Using the assumption in step 2, prove the statement for n = k+1. This is where almost all the algebra — and almost all the marks — live." },
              { num: 4, title: "Conclude", desc: "Since it's true for n = 1 and truth passes from k to k+1, it's true for every integer n ≥ 1 (or n₀). Write this sentence — examiners look for it." },
            ].map((s, i) => (
              <div key={s.num} className={`p-5 flex gap-4 items-start ${i !== 3 ? "border-b border-[#E5E5E5]" : ""}`}>
                <div className="w-6 h-6 rounded bg-[#E2E8F0] text-[#475569] flex items-center justify-center font-sans font-bold text-xs flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#111111]">{s.title}</h4>
                  <p className="font-sans text-xs text-[#666666] mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Which case am I looking at?",
      content: (
        <div className="flex flex-col gap-6 pb-12">
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            The framework above never changes, but <em>where the algebra gets hard</em> depends on what kind of statement you're handed. First-years who "understand induction" but still fail exam questions almost always haven't learned to recognise these four flavours. Every exercise in this chapter is one of them.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-serif text-lg font-bold text-[#1e293b]">Standard sum</h4>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Case 1</span>
              </div>
              <div className="bg-[#F1F5F9] rounded-lg p-3 text-center mb-3">
                <code className="text-xs text-[#334155] font-mono">"Prove that 1 + 2 + ... + n = ..."</code>
              </div>
              <p className="font-sans text-xs text-[#475569] leading-relaxed">
                <strong>Giveaway:</strong> a summation formula, base case at n=1. <strong>Strategy:</strong> add the (k+1)-th term to both sides and factor.
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-serif text-lg font-bold text-[#1e293b]">Shifted base case</h4>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Case 2</span>
              </div>
              <div className="bg-[#F1F5F9] rounded-lg p-3 text-center mb-3">
                <code className="text-xs text-[#334155] font-mono">"Prove that ... for all integers n {'>'} 3"</code>
              </div>
              <p className="font-sans text-xs text-[#475569] leading-relaxed">
                <strong>Giveaway:</strong> the statement is false for small n. <strong>Strategy:</strong> test small values to find where it starts holding — that's your real base case, not n=1.
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-serif text-lg font-bold text-[#1e293b]">Divisibility</h4>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Case 3</span>
              </div>
              <div className="bg-[#F1F5F9] rounded-lg p-3 text-center mb-3">
                <code className="text-xs text-[#334155] font-mono">"Show that ... is divisible by ..."</code>
              </div>
              <p className="font-sans text-xs text-[#475569] leading-relaxed">
                <strong>Giveaway:</strong> the word "divisible." <strong>Strategy:</strong> write f(k) = (divisor)·m, then show f(k+1) - f(k) is also a multiple of the divisor.
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-serif text-lg font-bold text-[#1e293b]">Inequality</h4>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Case 4</span>
              </div>
              <div className="bg-[#F1F5F9] rounded-lg p-3 text-center mb-3">
                <code className="text-xs text-[#334155] font-mono">"Prove that ... {'>'} ... for n ≥ ..."</code>
              </div>
              <p className="font-sans text-xs text-[#475569] leading-relaxed">
                <strong>Giveaway:</strong> a strict inequality, not an equation. <strong>Strategy:</strong> multiply or add a positive quantity to the inductive hypothesis, then show the result is still bigger than what you need.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden mt-4">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E5E5]">
                <tr>
                  <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">Statement Pattern</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">Case</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-bold uppercase text-[#64748b]">First Move</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] font-sans text-xs">
                <tr>
                  <td className="px-4 py-3">Σ of squares / cubes / linear terms = formula</td>
                  <td className="px-4 py-3 text-[#64748b]">Case 1</td>
                  <td className="px-4 py-3">Add the (k+1)-th term to the formula for n=k</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Inequality that fails for n = 1, 2</td>
                  <td className="px-4 py-3 text-[#64748b]">Case 2</td>
                  <td className="px-4 py-3">Find the smallest n₀ where it's actually true — test it</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">"...is divisible by..."</td>
                  <td className="px-4 py-3 text-[#64748b]">Case 3</td>
                  <td className="px-4 py-3">Write the IH as (divisor) × m, isolate the new terms</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Strict inequality for all n ≥ n₀</td>
                  <td className="px-4 py-3 text-[#64748b]">Case 4</td>
                  <td className="px-4 py-3">Multiply IH by something known-positive, keep the {'>'}/{'<'} direction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="editorial-heading text-xl text-[#111111] mt-8 mb-2">Worked examples, straight from the source text</h3>
          <WorkedExample title="1 + 2 + ... + n = n(n+1)/2" caseNum={1}>
            <div className="grid grid-cols-[100px_1fr] gap-y-4">
              <div className="text-[#94A3B8] uppercase text-[10px] font-bold">BASE, N=1</div>
              <div>1 = 1(2)/2 ✓</div>
              
              <div className="text-[#94A3B8] uppercase text-[10px] font-bold">ASSUME, N=K</div>
              <div>1 + 2 + ... + k = k(k+1)/2</div>
              
              <div className="text-[#94A3B8] uppercase text-[10px] font-bold">SHOW, N=K+1</div>
              <div>
                1 + 2 + ... + k + (k+1)<br/><br/>
                = k(k+1)/2 + (k+1)<br/>
                = [k(k+1) + 2(k+1)] / 2<br/>
                = (k+1)(k+2) / 2
              </div>
              
              <div className="text-[#94A3B8] uppercase text-[10px] font-bold">CONCLUDE</div>
              <div>Exactly the formula at n=k+1 — true for all n ≥ 1. ■</div>
            </div>
          </WorkedExample>
          
          <WorkedExample title="2ⁿ > n+4 for all integers n ≥ 3" caseNum={2}>
            <div className="text-xs text-[#475569] italic">
              Base case is n=3, since 2¹ ≯ 5 and 2² ≯ 6. For n=3, 8 {'>'} 7. ✓<br/><br/>
              Assume 2ᵏ {'>'} k+4.<br/>
              Show 2ᵏ⁺¹ {'>'} (k+1)+4 = k+5.<br/><br/>
              2ᵏ⁺¹ = 2·2ᵏ {'>'} 2(k+4) = 2k+8.<br/>
              Since k ≥ 3, 2k+8 is definitely strictly greater than k+5. ■
            </div>
          </WorkedExample>
        </div>
      )
    },
    {
      id: 3,
      title: "1.4 · Practice Set",
      content: (
        <div className="flex flex-col gap-6 pb-12">
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            The same five exercises from the source text. Try each one on paper first — reveal the hint before the full solution, and only after you've actually attempted it.
          </p>

          <PracticeExercise 
            num={1} 
            text="Prove that 1² + 2² + 3² + ... + n² = n(n+1)(2n+1)/6." 
            hint="Add (k+1)² to the assumption formula."
            solution={<>
              BASE: 1² = 1(2)(3)/6 = 1. ✓<br/>
              ASSUME: 1²+...+k² = k(k+1)(2k+1)/6.<br/>
              SHOW: k(k+1)(2k+1)/6 + (k+1)²<br/>
              = (k+1)[k(2k+1)/6 + (k+1)]<br/>
              = (k+1)[2k²+k+6k+6]/6<br/>
              = (k+1)(k+2)(2k+3)/6. ■
            </>}
            badge="CASE 1"
          />

          <PracticeExercise 
            num={2} 
            text="Prove that 2ⁿ < n! for n ≥ 4." 
            hint="Base case is n=4. For step, 2(k!) < (k+1)(k!)."
            solution={<>Base: 2⁴=16, 4!=24. 16&lt;24 ✓...</>}
            badge="CASE 2"
          />

          <PracticeExercise 
            num={3} 
            text="Prove that 1³ + 2³ + 3³ + ... + n³ = n²(n+1)²/4." 
            hint="Same pattern as Case 1, add (k+1)³ and factor out (k+1)²."
            solution={<>
              BASE: 1³ = 1²(2)²/4 = 4/4 = 1. ✓<br/>
              ASSUME: 1³+...+k³ = k²(k+1)²/4.<br/>
              SHOW: k²(k+1)²/4 + (k+1)³<br/>
              = (k+1)²[k²/4 + (k+1)]<br/>
              = (k+1)²[k² + 4k + 4]/4<br/>
              = (k+1)²(k+2)²/4. ■
            </>}
            badge="CASE 1"
          />

          <PracticeExercise 
            num={4} 
            text="Show that n³ + 2n is divisible by 3, for every positive integer n." 
            hint="Write k³ + 2k = 3M. Expand (k+1)³ + 2(k+1)."
            solution={<>
              BASE: 1³ + 2(1) = 3 = 3(1). ✓<br/>
              ASSUME: k³ + 2k = 3M.<br/>
              SHOW: (k+1)³ + 2(k+1)<br/>
              = k³ + 3k² + 3k + 1 + 2k + 2<br/>
              = (k³ + 2k) + 3k² + 3k + 3<br/>
              = 3M + 3(k² + k + 1) = 3(M + k² + k + 1). ■
            </>}
            badge="CASE 3"
          />
        </div>
      )
    },
    {
      id: 4,
      title: "1.3 · Well-Ordered Sets",
      content: (
        <div className="flex flex-col gap-6 pb-12">
          <p className="editorial-body text-base text-[#475569] leading-relaxed">
            This one is deliberately short — one definition and one principle, both worth memorising word for word because they get quoted, not derived.
          </p>

          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 border-l-4 border-l-[#2563EB] shadow-sm">
            <h4 className="font-sans font-bold text-[#111111] mb-2">Definition</h4>
            <p className="font-sans text-sm text-[#475569] leading-relaxed">
              A non-empty subset S of ℤ is <strong>well-ordered</strong> if S contains a least element.
            </p>
          </div>

          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 border-l-4 border-l-[#059669] shadow-sm">
            <h4 className="font-sans font-bold text-[#111111] mb-2">Principle of Well-Ordering</h4>
            <p className="font-sans text-sm text-[#475569] leading-relaxed">
              Every non-empty subset of the natural numbers is well-ordered. ℤ itself is not well-ordered (no smallest integer) — but ℕ always is. This principle turns out to be logically equivalent to the Principle of Mathematical Induction: each can be used to prove the other.
            </p>
          </div>

          <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
            <h3 className="editorial-heading text-lg text-[#111111] mb-4">Before you move on</h3>
            <div className="flex flex-col gap-3">
              {[
                "I can place ℕ, ℤ, ℚ, ℝ, and 𝕀 correctly on the nested-set diagram without looking.",
                "I can write the 4-step induction framework from memory.",
                "Given a new statement, I can name which of the 4 cases it is before I start writing algebra.",
                "I solved all 5 practice exercises myself before checking the solutions.",
                "I can state the definition of a well-ordered set and the Principle of Well-Ordering."
              ].map((text, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]" />
                  <span className="font-sans text-xs text-[#475569] group-hover:text-[#111111] transition-colors">{text}</span>
                </label>
              ))}
            </div>
            
            <Link href={`/courses/${courseId}/roadmap`}>
              <div className="mt-8 bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#111111]/30 transition-colors cursor-pointer group flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Up next — Weeks 2–3</span>
                  <h4 className="font-serif text-lg font-bold text-[#111111] group-hover:text-[#2563EB] transition-colors mt-1">Chapter 2 · Complex Numbers</h4>
                  <p className="font-sans text-xs text-[#64748b] mt-1">Booklet content for this chapter is in progress.</p>
                </div>
                <ChevronRight size={20} className="text-[#CBD5E1] group-hover:text-[#2563EB] transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}/chapter/axioms`} className="text-[#666666] hover:text-[#111111] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
              MATH 151
            </span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#111111]">
              Booklet Ch. 1
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Scroll Pane */}
        <div className="w-full md:w-[55%] h-full overflow-y-auto border-r border-[#E5E5E5] scroll-smooth">
          <div className="p-8 md:p-12 max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-3">
                  1.{step + 1}
                </span>
                <h1 className="editorial-heading text-3xl md:text-4xl text-[#111111] mb-6">
                  {steps[step].title}
                </h1>
                
                {steps[step].content}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right 3D Pane */}
        <div className="hidden md:flex w-[45%] bg-[#F1F5F9] relative flex-col shadow-inner">
          <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 4, 6], fov: 45 }}>
              {step === 0 && <NestedSetsScene buildStep={buildStep} />}
              {step > 0 && <EducationalDominos />}
            </Canvas>
          </div>
          
          {/* Instructions Overlay */}
          <div className="absolute top-8 right-8 z-10 bg-white/80 backdrop-blur border border-white/20 px-4 py-2 rounded-full shadow-sm">
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Interactive 3D View</span>
          </div>
          
          {/* Controls Footer Overlay */}
          <div className="mt-auto relative z-10 p-8 bg-gradient-to-t from-[#F1F5F9] via-[#F1F5F9]/80 to-transparent">
            <div className="flex items-center justify-between">
              <button 
                onClick={prevStep}
                disabled={step === 0}
                className="w-12 h-12 rounded-full border border-[#CBD5E1] bg-white flex items-center justify-center text-[#1E293B] disabled:opacity-30 hover:bg-[#F8FAFC] transition-colors shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-3">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-[#2563EB]" : "w-1.5 bg-[#CBD5E1]"}`} />
                ))}
              </div>

              <button 
                onClick={nextStep}
                disabled={step === steps.length - 1}
                className="w-12 h-12 rounded-full bg-[#111111] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#2563EB] transition-colors shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
