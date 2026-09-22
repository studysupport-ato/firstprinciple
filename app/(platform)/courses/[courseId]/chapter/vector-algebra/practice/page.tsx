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

const quizQuestions = [
  {
    id: 1,
    question: "If $\\vec{a} = [1, 0, 0]$ and $\\vec{b} = [0, 1, 0]$, what is the cross product $\\vec{a} \\times \\vec{b}$?",
    options: ["[0, 0, 1]", "[0, 0, -1]", "[1, 1, 0]", "[0, 0, 0]"],
    correctAnswer: 0,
    hint: "Use the right-hand rule. The cross product of the X-axis and Y-axis points strictly along the positive Z-axis."
  },
  {
    id: 2,
    question: "The cross product of two non-zero parallel vectors is always:",
    options: ["1", "Undefined", "The zero vector", "A perpendicular vector"],
    correctAnswer: 2,
    hint: "The magnitude of a cross product relies on $\\sin(\\theta)$. For parallel vectors, $\\theta = 0$, and $\\sin(0) = 0$."
  },
  {
    id: 3,
    question: "Which of the following properties is true about the cross product?",
    options: ["It is commutative ($\\vec{a} \\times \\vec{b} = \\vec{b} \\times \\vec{a}$)", "It is anti-commutative ($\\vec{a} \\times \\vec{b} = -(\\vec{b} \\times \\vec{a})$)", "It always results in a scalar", "It only applies to 2D vectors"],
    correctAnswer: 1,
    hint: "Flipping the order of the vectors reverses the direction of the normal vector by exactly 180 degrees."
  },
  {
    id: 4,
    question: "What is the geometric meaning of the magnitude $|\\vec{a} \\times \\vec{b}|$?",
    options: ["The angle between the vectors", "The volume of a parallelepiped", "The sum of their lengths", "The area of the parallelogram spanned by $\\vec{a}$ and $\\vec{b}$"],
    correctAnswer: 3,
    hint: "Magnitude is equal to $|a||b|\\sin(\\theta)$, which is exactly the formula for the area of a parallelogram."
  },
  {
    id: 5,
    question: "If vector $\\vec{c} = \\vec{a} \\times \\vec{b}$, what is the value of the dot product $\\vec{c} \\cdot \\vec{a}$?",
    options: ["0", "1", "$|\\vec{c}||\\vec{a}|$", "Cannot be determined"],
    correctAnswer: 0,
    hint: "The cross product $\\vec{c}$ is orthogonal (perpendicular) to both $\\vec{a}$ and $\\vec{b}$. The dot product of any two perpendicular vectors is zero."
  }
];

export default function VectorQuizPage() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    if (!isSubmitted) {
      if (selectedOption === quizQuestions[currentQuestion].correctAnswer) {
        setScore(score + 1);
      }
      setIsSubmitted(true);
    } else {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsSubmitted(false);
      } else {
        setQuizFinished(true);
      }
    }
  };

  if (!mounted) return null;

  const question = quizQuestions[currentQuestion];
  const progressPercentage = ((currentQuestion) / quizQuestions.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-transparent relative">
      
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${params.courseId}/roadmap`} className="text-[#666666] hover:text-[#111111] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
              Vector Algebra
            </span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#111111]">
              Practice Assessment
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="hidden md:flex items-center gap-4 w-64">
          <span className="font-sans text-xs font-semibold text-[#666666]">
            {currentQuestion + (quizFinished ? 0 : 1)} of {quizQuestions.length}
          </span>
          <div className="flex-1 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#111111] transition-all duration-500 ease-out"
              style={{ width: `${quizFinished ? 100 : progressPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Quiz Area */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          
          <AnimatePresence mode="wait">
            {!quizFinished ? (
              <motion.div
                key={`q-${currentQuestion}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-[#E5E5E5] rounded-3xl p-8 md:p-12 shadow-sm"
              >
                
                <span className="inline-block px-3 py-1 bg-transparent text-[#666666] font-sans text-xs font-bold uppercase tracking-widest rounded-full mb-8">
                  Question {currentQuestion + 1}
                </span>

                <h2 className="editorial-heading text-2xl md:text-3xl text-[#111111] mb-10 leading-relaxed">
                  {question.question.split(/(\$.*?\$)/g).map((part, i) => {
                    if (part.startsWith("$") && part.endsWith("$")) {
                      return <MathText key={i} math={part.slice(1, -1)} />;
                    }
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
                      else if (isSelected && !isCorrect) stateClass = "border-[#E11D48] bg-rose-50";
                      else stateClass = "border-[#E5E5E5] bg-white opacity-50";
                    } else if (isSelected) {
                      stateClass = "border-[#2563EB] bg-blue-50 shadow-sm ring-1 ring-[#2563EB]";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isSubmitted}
                        className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center justify-between ${stateClass}`}
                      >
                        <span className="font-sans text-lg text-[#111111]">
                          {opt.split(/(\$.*?\$)/g).map((part, i) => {
                            if (part.startsWith("$") && part.endsWith("$")) {
                              return <MathText key={i} math={part.slice(1, -1)} />;
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </span>
                        
                        {isSubmitted && isCorrect && <CheckCircle2 className="text-[#059669]" size={24} />}
                        {isSubmitted && isSelected && !isCorrect && <XCircle className="text-[#E11D48]" size={24} />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <div className={`p-6 rounded-2xl mb-8 ${selectedOption === question.correctAnswer ? 'bg-emerald-50 border border-emerald-100' : 'bg-transparent border border-[#E5E5E5]'}`}>
                        <span className="font-sans text-xs font-bold uppercase tracking-widest block mb-2 text-[#666666]">
                          {selectedOption === question.correctAnswer ? 'Great Job!' : 'Explanation'}
                        </span>
                        <p className="font-sans text-[#111111]">
                          {question.hint.split(/(\$.*?\$)/g).map((part, i) => {
                            if (part.startsWith("$") && part.endsWith("$")) {
                              return <MathText key={i} math={part.slice(1, -1)} />;
                            }
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
                    {!isSubmitted ? "Check Answer" : currentQuestion < quizQuestions.length - 1 ? "Next Question" : "View Results"}
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
                
                <h2 className="editorial-heading text-4xl text-[#111111] mb-2">Practice Complete!</h2>
                <p className="font-sans text-[#666666] mb-8">You have completed the Vector Algebra assessment.</p>

                <div className="bg-transparent rounded-2xl p-8 mb-8 border border-[#E5E5E5]">
                  <span className="font-sans text-sm font-bold uppercase tracking-widest text-[#666666] block mb-2">Final Score</span>
                  <div className="flex items-end justify-center gap-2">
                    <span className="font-sans text-6xl font-black text-[#111111]">{score}</span>
                    <span className="font-sans text-xl text-[#666666] mb-2">/ {quizQuestions.length}</span>
                  </div>
                </div>

                <Link href={`/courses/${params.courseId}/roadmap`}>
                  <button className="w-full h-14 bg-[#111111] text-white rounded-full font-sans font-semibold hover:bg-[#2563EB] transition-colors shadow-lg">
                    Return to Roadmap
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
