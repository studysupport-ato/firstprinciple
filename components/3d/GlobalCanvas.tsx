"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";

export function GlobalCanvas() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef} 
      className="pointer-events-none fixed inset-0 z-[100]"
    >
      <Canvas
        eventSource={document.getElementById("platform-root") || document.body}
        className="pointer-events-none"
      >
        <View.Port />
      </Canvas>
    </div>
  );
}
