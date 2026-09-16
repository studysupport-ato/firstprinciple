"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArgandPlane } from "@/components/math-viz/ArgandPlane";
import katex from "katex";

// Helper for rendering KaTeX safely
function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "block text-center my-6 text-xl" : "inline"}`} />;
}

const lessonSteps = [
  {
    id: 1,
    title: "The 1D Number Line",
    content: "Until now, numbers have existed on a single, one-dimensional line. The Real Numbers ($\\mathbb{R}$) stretch infinitely left and right.",
    math: null,
    vizState: { z: null, showYAxis: false, showModulus: false, showAngle: false }
  },
  {
    id: 2,
    title: "The Imaginary Unit",
    content: "To solve equations like $x^2 = -1$, we introduce the imaginary unit $i$. This creates a completely new axis, perpendicular to the real numbers.",
    math: "i^2 = -1 \\implies i = \\sqrt{-1}",
    vizState: { z: null, showYAxis: true, showModulus: false, showAngle: false }
  },
  {
    id: 3,
    title: "The Complex Plane",
    content: "A complex number has a real part and an imaginary part. It exists as a specific coordinate $(a, b)$ in this 2D space, which we call the Argand Plane.",
    math: "z = a + bi",
    vizState: { z: { re: 3, im: 4 }, showYAxis: true, showModulus: false, showAngle: false }
  },
  {
    id: 4,
    title: "The Modulus",
    content: "The modulus $|z|$ is simply the distance from the origin to the point $z$. By the Pythagorean theorem, this is $\\sqrt{a^2 + b^2}$.",
    math: "|z| = \\sqrt{3^2 + 4^2} = 5",
    vizState: { z: { re: 3, im: 4 }, showYAxis: true, showModulus: true, showAngle: false }
  },
  {
    id: 5,
    title: "The Argument",
    content: "The argument $\\theta$ is the angle the vector makes with the positive real axis. Together, the modulus and argument give us the Polar Form.",
    math: "\\theta = \\tan^{-1}\\left(\\frac{4}{3}\\right) \\approx 53.1^\\circ",
    vizState: { z: { re: 3, im: 4 }, showYAxis: true, showModulus: true, showAngle: true }
  }
];

export default function LessonPage() {
  const params = useParams();
  const [currentStep, setCurrentStep] = useState(0);

  const step = lessonSteps[currentStep];
  const isComplete = currentStep === lessonSteps.length - 1;

  const nextStep = () => {
    if (currentStep < lessonSteps.length - 1) setCurrentStep(curr => curr + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* Lesson Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${params.courseId}/roadmap`} className="text-[#666666] hover:text-[#111111] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
              Complex Numbers
            </span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#111111]">
              The Argand Plane
            </span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {lessonSteps.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= currentStep ? "bg-[#2563EB]" : "bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Lesson Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Content & Interaction */}
        <div className="w-full lg:w-[45%] flex flex-col justify-between border-r border-[#E5E5E5] bg-white relative z-10">
          
          <div className="p-12 lg:p-16 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <span className="font-sans text-xs font-semibold text-[#2563EB] uppercase tracking-wider">
                  Step {step.id} of {lessonSteps.length}
                </span>
                
                <h1 className="editorial-heading text-4xl mb-2">
                  {step.title}
                </h1>
                
                <div className="editorial-body text-[#111111]">
                  {/* Note: In a real DB setup, we'd parse markdown here. For the demo, we split by $ for basic inline KaTeX. */}
                  {step.content.split(/(\$.*?\$)/g).map((part, i) => {
                    if (part.startsWith("$") && part.endsWith("$")) {
                      return <MathText key={i} math={part.slice(1, -1)} />;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>

                {step.math && (
                  <MathText math={step.math} block={true} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="p-8 border-t border-[#E5E5E5] bg-[#F7F7F8] flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 text-sm font-sans font-medium text-[#666666] disabled:opacity-30 hover:text-[#111111] transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            {!isComplete ? (
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-white rounded-full text-sm font-semibold hover:bg-[#2563EB] transition-colors shadow-sm"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <Link href={`/courses/${params.courseId}/roadmap`}>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#059669] text-white rounded-full text-sm font-semibold hover:scale-105 transition-transform shadow-sm">
                  Complete Lesson <CheckCircle2 size={16} />
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Right Side: The Interactive Visualizer */}
        <div className="hidden lg:flex w-[55%] items-center justify-center p-12 bg-[#FFFFFF]">
          <ArgandPlane {...step.vizState} />
        </div>

      </div>
    </div>
  );
}
