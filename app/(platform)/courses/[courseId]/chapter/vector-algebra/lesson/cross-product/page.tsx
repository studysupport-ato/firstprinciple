"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import katex from "katex";
import { CrossProductScene } from "@/components/3d/CrossProductScene";

function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "block text-center my-6 text-xl" : "inline"}`} />;
}

const lessonSteps = [
  {
    id: 1,
    title: "Vectors in 3D Space",
    content: "Unlike standard coordinate geometry, vectors possess both magnitude and direction. In a 3D coordinate system, any vector $\\vec{v}$ can be represented by components in the $x$, $y$, and $z$ axes.",
    math: "\\vec{v} = x\\hat{i} + y\\hat{j} + z\\hat{k}",
    vizState: { v1: [3, 0, 0] as [number,number,number], v2: [0, 2, 0] as [number,number,number], showResult: false }
  },
  {
    id: 2,
    title: "The Cross Product",
    content: "The cross product of two vectors, $\\vec{a} \\times \\vec{b}$, generates a completely new vector. But unlike the dot product (which yields a scalar), the cross product is inherently spatial.",
    math: "\\vec{c} = \\vec{a} \\times \\vec{b}",
    vizState: { v1: [3, 0, 0] as [number,number,number], v2: [0, 2, 0] as [number,number,number], showResult: false }
  },
  {
    id: 3,
    title: "Orthogonality",
    content: "The most vital property of the cross product: The resulting vector is perfectly orthogonal (perpendicular) to BOTH original vectors, forming a normal to the plane they create.",
    math: "\\vec{c} \\cdot \\vec{a} = 0 \\quad \\text{and} \\quad \\vec{c} \\cdot \\vec{b} = 0",
    vizState: { v1: [3, 0, 0] as [number,number,number], v2: [0, 2, 0] as [number,number,number], showResult: true }
  },
  {
    id: 4,
    title: "The Right-Hand Rule",
    content: "If you point your index finger along $\\vec{a}$ and your middle finger along $\\vec{b}$, your thumb points strictly in the direction of $\\vec{a} \\times \\vec{b}$. Notice the red vector extending upwards.",
    math: null,
    vizState: { v1: [2, 1, 0] as [number,number,number], v2: [-1, 2, 0] as [number,number,number], showResult: true }
  }
];

export default function VectorLessonPage() {
  const params = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const step = lessonSteps[currentStep];
  const isComplete = currentStep === lessonSteps.length - 1;

  const nextStep = () => {
    setCurrentStep(curr => (curr < lessonSteps.length - 1 ? curr + 1 : curr));
  };

  const prevStep = () => {
    setCurrentStep(curr => (curr > 0 ? curr - 1 : curr));
  };

  if (!mounted || !step) return null;

  return (
    <div className="flex flex-col h-screen bg-white relative">
      
      {/* Lesson Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white/90 backdrop-blur-sm z-20">
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
              The Cross Product
            </span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {lessonSteps.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= currentStep ? "bg-[#111111]" : "bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Lesson Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Content & Interaction */}
        <div className="w-full lg:w-[45%] flex flex-col justify-between border-r border-[#E5E5E5] bg-white relative z-10 shadow-2xl">
          
          <div className="p-12 lg:p-16 overflow-y-auto">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              <span className="font-sans text-xs font-semibold text-[#666666] uppercase tracking-wider">
                Step {step.id} of {lessonSteps.length}
              </span>
              
              <h1 className="editorial-heading text-4xl md:text-5xl mb-2">
                {step.title}
              </h1>
              
              <div className="editorial-body text-[#111111] text-lg">
                {step.content.split(/(\$.*?\$)/g).map((part, i) => {
                  if (part.startsWith("$") && part.endsWith("$")) {
                    return <MathText key={i} math={part.slice(1, -1)} />;
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>

              {step.math && (
                <div className="bg-transparent border border-[#E5E5E5] rounded-2xl py-6 px-4 mt-4">
                  <MathText math={step.math} block={true} />
                </div>
              )}
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="p-8 border-t border-[#E5E5E5] bg-transparent flex items-center justify-between">
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

        {/* Right Side: R3F Canvas */}
        <div className="hidden lg:block w-[55%] h-full relative bg-transparent">
          <Canvas camera={{ position: [3, 4, 8], fov: 45 }} className="w-full h-full cursor-move">
            <color attach="background" args={['#FAFAFA']} />
            <React.Suspense fallback={null}>
              <CrossProductScene {...step.vizState} />
            </React.Suspense>
          </Canvas>
          
          <div className="absolute bottom-8 right-8 bg-white/80 backdrop-blur-md border border-[#E5E5E5] px-4 py-2 rounded-full pointer-events-none">
            <span className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#111111]">
              Interactive 3D Space (Drag to rotate)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
