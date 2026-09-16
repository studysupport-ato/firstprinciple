"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import katex from "katex";

function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "block text-center my-4 text-xl" : "inline"}`} />;
}

// Chapter-specific questions keyed by chapterId
const questionBank: Record<string, Array<{
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
}>> = {
  "argand-plane": [
    {
      id: 1,
      question: "In the Argand plane, where is the complex number $3 + 4i$ plotted?",
      options: ["(4, 3)", "(3, 4)", "(-3, 4)", "(3, -4)"],
      correctAnswer: 1,
      hint: "The real part maps to the x-axis, the imaginary part to the y-axis."
    },
    {
      id: 2,
      question: "What is the modulus of $3 + 4i$?",
      options: ["7", "5", "25", "$\\sqrt{7}$"],
      correctAnswer: 1,
      hint: "Use the Pythagorean theorem: $|z| = \\sqrt{a^2 + b^2} = \\sqrt{9 + 16} = 5$."
    },
    {
      id: 3,
      question: "The complex conjugate of $a + bi$ is:",
      options: ["$-a - bi$", "$a - bi$", "$-a + bi$", "$bi - a$"],
      correctAnswer: 1,
      hint: "The conjugate flips the sign of the imaginary part only."
    },
    {
      id: 4,
      question: "Multiplying a complex number by $i$ geometrically corresponds to:",
      options: ["A reflection over the x-axis", "A rotation of 90° counterclockwise", "A scaling by 2", "No change"],
      correctAnswer: 1,
      hint: "Multiplying by $i$ adds 90° to the argument of the complex number."
    },
    {
      id: 5,
      question: "If $z = -1 + i$, what is the argument (angle) of $z$ in standard position?",
      options: ["$45°$", "$135°$", "$-45°$", "$225°$"],
      correctAnswer: 1,
      hint: "The point (-1, 1) lies in the second quadrant. $\\arctan(1/-1) = -45°$, adjusted to the second quadrant gives $135°$."
    },
  ],
  "axioms": [
    {
      id: 1,
      question: "Which axiom guarantees that $a + b = b + a$ for all real numbers?",
      options: ["Associativity of Addition", "Commutativity of Addition", "Distributivity", "Identity of Addition"],
      correctAnswer: 1,
      hint: "Commutativity means the order of operands doesn't matter."
    },
    {
      id: 2,
      question: "What is the additive identity in the real number field?",
      options: ["1", "-1", "0", "$\\infty$"],
      correctAnswer: 2,
      hint: "The additive identity $e$ satisfies $a + e = a$ for all $a$."
    },
    {
      id: 3,
      question: "Which axiom states that $(a \\cdot b) \\cdot c = a \\cdot (b \\cdot c)$?",
      options: ["Commutativity of Multiplication", "Associativity of Multiplication", "Distributivity", "Closure"],
      correctAnswer: 1,
      hint: "Associativity allows regrouping of operations without changing the result."
    },
    {
      id: 4,
      question: "The multiplicative inverse of $a$ (where $a \\neq 0$) is:",
      options: ["$-a$", "$a^2$", "$1/a$", "$0$"],
      correctAnswer: 2,
      hint: "The multiplicative inverse satisfies $a \\cdot a^{-1} = 1$."
    },
    {
      id: 5,
      question: "The Distributive Law states that $a(b + c)$ equals:",
      options: ["$ab + c$", "$a + bc$", "$ab + ac$", "$(a+b)(a+c)$"],
      correctAnswer: 2,
      hint: "Distribution spreads multiplication across addition: each term inside gets multiplied."
    },
  ],
};

// Fallback generic questions
const genericQuestions = [
  {
    id: 1,
    question: "Which of the following best defines a mathematical proof?",
    options: ["An educated guess", "A logical sequence of deductions from axioms to a conclusion", "A numerical calculation", "An empirical observation"],
    correctAnswer: 1,
    hint: "A proof derives truth from already accepted truths using logic — not evidence or calculation."
  },
  {
    id: 2,
    question: "What does 'necessary and sufficient' mean in mathematics?",
    options: ["The condition is sometimes true", "The condition must hold in both directions (if and only if)", "The condition is true only in special cases", "The condition is always false"],
    correctAnswer: 1,
    hint: "'Necessary' means the condition must hold. 'Sufficient' means if it holds, the conclusion follows. Together: if and only if."
  },
  {
    id: 3,
    question: "A function $f: A \\to B$ is called injective (one-to-one) if:",
    options: ["Every element of $B$ is mapped to", "Different elements of $A$ map to different elements of $B$", "Some elements are mapped more than once", "It is both left and right invertible"],
    correctAnswer: 1,
    hint: "Injectivity means no two distinct inputs produce the same output."
  },
];

export default function ChapterPracticePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const chapterId = params.chapterId as string;

  const [mounted, setMounted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => setMounted(true), []);

  const questions = questionBank[chapterId] || genericQuestions;
  const question = questions[currentQuestion];

  const handleSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    if (!isSubmitted) {
      if (selectedOption === question.correctAnswer) setScore(s => s + 1);
      setIsSubmitted(true);
    } else {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(q => q + 1);
        setSelectedOption(null);
        setIsSubmitted(false);
      } else {
        setQuizFinished(true);
      }
    }
  };

  const chapterTitle = chapterId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F7F7F8]">
      
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="text-[#666666] hover:text-[#111111] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
              {chapterTitle}
            </span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#111111]">
              Practice Assessment
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 w-64">
          <span className="font-sans text-xs font-semibold text-[#666666]">
            {currentQuestion + (quizFinished ? 0 : 1)} of {questions.length}
          </span>
          <div className="flex-1 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#111111] transition-all duration-500"
              style={{ width: `${quizFinished ? 100 : (currentQuestion / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Quiz Area */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {!quizFinished ? (
              <motion.div
                key={`q-${currentQuestion}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="bg-white border border-[#E5E5E5] rounded-3xl p-8 md:p-12 shadow-sm"
              >
                <span className="inline-block px-3 py-1 bg-[#F7F7F8] text-[#666666] font-sans text-xs font-bold uppercase tracking-widest rounded-full mb-8">
                  Question {currentQuestion + 1}
                </span>

                <h2 className="editorial-heading text-2xl md:text-3xl text-[#111111] mb-10 leading-relaxed">
                  {question.question.split(/(\$.*?\$)/g).map((part, i) => {
                    if (part.startsWith("$") && part.endsWith("$")) return <MathText key={i} math={part.slice(1, -1)} />;
                    return <span key={i}>{part}</span>;
                  })}
                </h2>

                <div className="flex flex-col gap-4 mb-10">
                  {question.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === question.correctAnswer;
                    let stateClass = "border-[#E5E5E5] hover:border-[#111111] bg-white";
                    if (isSubmitted) {
                      if (isCorrect) stateClass = "border-[#059669] bg-emerald-50";
                      else if (isSelected) stateClass = "border-[#E11D48] bg-rose-50";
                      else stateClass = "border-[#E5E5E5] bg-white opacity-40";
                    } else if (isSelected) {
                      stateClass = "border-[#2563EB] bg-blue-50 ring-1 ring-[#2563EB]";
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isSubmitted}
                        className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center justify-between ${stateClass}`}
                      >
                        <span className="font-sans text-base text-[#111111]">
                          {opt.split(/(\$.*?\$)/g).map((part, i) => {
                            if (part.startsWith("$") && part.endsWith("$")) return <MathText key={i} math={part.slice(1, -1)} />;
                            return <span key={i}>{part}</span>;
                          })}
                        </span>
                        {isSubmitted && isCorrect && <CheckCircle2 className="text-[#059669] flex-shrink-0" size={22} />}
                        {isSubmitted && isSelected && !isCorrect && <XCircle className="text-[#E11D48] flex-shrink-0" size={22} />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden mb-8"
                    >
                      <div className={`p-6 rounded-2xl ${selectedOption === question.correctAnswer ? "bg-emerald-50 border border-emerald-100" : "bg-[#F7F7F8] border border-[#E5E5E5]"}`}>
                        <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#666666] block mb-2">
                          {selectedOption === question.correctAnswer ? "Correct!" : "Explanation"}
                        </span>
                        <p className="font-sans text-[#111111]">
                          {question.hint.split(/(\$.*?\$)/g).map((part, i) => {
                            if (part.startsWith("$") && part.endsWith("$")) return <MathText key={i} math={part.slice(1, -1)} />;
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={selectedOption === null}
                    className="flex items-center gap-2 px-8 py-4 bg-[#111111] text-white rounded-full font-sans font-semibold disabled:opacity-30 hover:bg-[#2563EB] transition-colors"
                  >
                    {!isSubmitted ? "Check Answer" : currentQuestion < questions.length - 1 ? "Next Question" : "View Results"}
                    {isSubmitted && <ArrowRight size={18} />}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-[#E5E5E5] rounded-3xl p-12 shadow-sm text-center max-w-lg mx-auto"
              >
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="text-amber-500" size={32} />
                </div>
                <h2 className="editorial-heading text-4xl text-[#111111] mb-2">Assessment Complete!</h2>
                <p className="font-sans text-[#666666] mb-8">{chapterTitle} chapter practice</p>
                <div className="bg-[#F7F7F8] rounded-2xl p-8 mb-8 border border-[#E5E5E5]">
                  <span className="font-sans text-sm font-bold uppercase tracking-widest text-[#666666] block mb-2">Final Score</span>
                  <div className="flex items-end justify-center gap-2">
                    <span className="font-sans text-6xl font-black text-[#111111]">{score}</span>
                    <span className="font-sans text-xl text-[#666666] mb-2">/ {questions.length}</span>
                  </div>
                </div>
                <Link href={`/courses/${courseId}/chapter/${chapterId}`}>
                  <button className="w-full h-14 bg-[#111111] text-white rounded-full font-sans font-semibold hover:bg-[#2563EB] transition-colors shadow-lg">
                    Back to Chapter
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
