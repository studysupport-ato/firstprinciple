"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  index?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}

export function AnimatedItem({
  children,
  className = "",
  delay = 0,
  index = 0,
  direction = "up",
  distance = 30,
}: AnimatedItemProps) {
  const getVariants = () => {
    const hidden = {
      opacity: 0,
      y: direction === "up" ? distance : direction === "down" ? -distance : 0,
      x: direction === "left" ? distance : direction === "right" ? -distance : 0,
      scale: direction === "none" ? 0.95 : 1,
    };

    const visible = {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as const, // expo.out equivalent in framer motion
        delay: delay + index * 0.1,
      },
    };

    return { hidden, visible };
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
}
