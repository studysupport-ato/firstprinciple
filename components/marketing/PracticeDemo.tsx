"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedItem } from "@/components/motion/AnimatedItem";

const question = {
  text: "Which of the following is NOT a real number?",
  options: [
    { id: "a", label: "π (pi)", correct: false },
    { id: "b", label: "√(−4)", correct: true },
    { id: "c", label: "0.333...", correct: false },
    { id: "d", label: "−7", correct: false },
  ],
  explanation: "√(−4) involves the square root of a negative number, which requires the imaginary unit 'i' (it equals 2i). Therefore, it is a complex number, not a real number."
};

export function PracticeDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected && question.options.find(o => o.id === selected)?.correct;

  return (
    <section id="practice" className="py-32 bg-[#FFF8E5]">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Practice UI */}
          <AnimatedItem direction="right" distance={40} className="w-full max-w-[500px] mx-auto lg:mx-0">
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <span className="font-sans text-[10px] font-semibold tracking-widest text-[#FFBE00] uppercase">
                  Practice Mode
                </span>
                <span className="font-sans text-[10px] text-[#5D5149]">
                  Question 1 of 5
                </span>
              </div>

              <p className="font-serif text-xl text-[#111111] mb-8 leading-snug">
                {question.text}
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {question.options.map((opt) => {
                  let buttonClass = "border-[#E5E5E5] bg-[#FAFAFA] text-[#111111] hover:border-[#FFBE00]";
                  if (submitted) {
                    if (opt.correct) buttonClass = "border-[#059669] bg-[#059669]/5 text-[#059669]";
                    else if (selected === opt.id) buttonClass = "border-[#E11D48] bg-[#E11D48]/5 text-[#E11D48]";
                    else buttonClass = "border-[#E5E5E5] bg-[#FAFAFA] text-[#666666] opacity-50";
                  } else if (selected === opt.id) {
                    buttonClass = "border-[#FFBE00] bg-[#FFBE00]/5 text-[#FFBE00]";
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={submitted}
                      onClick={() => setSelected(opt.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 ${buttonClass}`}
                    >
                      <span className="font-sans text-xs font-semibold uppercase opacity-60">
                        {opt.id}
                      </span>
                      <span className="font-sans text-sm font-medium">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div className={`p-4 rounded-xl mb-6 text-sm font-sans ${isCorrect ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#E11D48]/10 text-[#E11D48]'}`}>
                      <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite."}</p>
                      <p className="opacity-90 leading-relaxed">{question.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!submitted ? (
                <button 
                  onClick={() => setSubmitted(true)}
                  disabled={!selected}
                  className="w-full py-3 bg-[#111111] text-white rounded-xl text-sm font-medium disabled:opacity-30 disabled:hover:scale-100 hover:scale-[1.02] transition-transform"
                >
                  Check Answer
                </button>
              ) : (
                <button 
                  onClick={() => { setSubmitted(false); setSelected(null); }}
                  className="w-full py-3 bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] rounded-xl text-sm font-medium hover:border-[#FFBE00] transition-colors"
                >
                  Try Again
                </button>
              )}

            </div>
          </AnimatedItem>

          {/* Right Column - Copy */}
          <div className="flex flex-col lg:pl-12">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#666666] mb-4">
              Active Recall
            </span>
            <AnimatedItem>
              <h2 className="editorial-heading text-4xl sm:text-5xl mb-8 max-w-lg">
                Practice integrated <br />
                <span className="text-[#666666] italic">directly into learning.</span>
              </h2>
            </AnimatedItem>
            
            <AnimatedItem delay={0.2}>
              <p className="editorial-body max-w-md mb-6">
                Waiting until the end of a chapter to test your knowledge is too late. Back2Basics with Kwamina interleaves practice questions immediately after concepts are introduced.
              </p>
              <p className="editorial-body max-w-md">
                Every wrong answer is treated as a teaching moment. Detailed explanations help resolve misconceptions in real-time, closing the loop between seeing and knowing.
              </p>
            </AnimatedItem>
          </div>

        </div>
      </div>
    </section>
  );
}
