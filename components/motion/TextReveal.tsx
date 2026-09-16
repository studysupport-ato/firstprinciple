"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

interface TextRevealProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  type?: "chars" | "words" | "lines";
  delay?: number;
  stagger?: number;
}

export function TextReveal({
  children,
  as: Tag = "div",
  className = "",
  type = "words",
  delay = 0,
  stagger = 0.04,
}: TextRevealProps) {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const split = new SplitText(containerRef.current, {
        type: `${type},lines`,
        linesClass: "split-parent",
      });

      const targets = split[type];

      gsap.from(targets, {
        yPercent: 110,
        opacity: 0,
        rotationZ: 2,
        duration: 1.2,
        ease: "power4.out",
        stagger: stagger,
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        },
      });

      return () => split.revert();
    },
    { scope: containerRef }
  );

  const Component = Tag as any;

  return (
    <Component ref={containerRef} className={className}>
      {children}
    </Component>
  );
}
