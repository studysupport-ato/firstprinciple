"use client";

import { motion } from "framer-motion";

interface ArgandPlaneProps {
  z: { re: number; im: number } | null;
  showYAxis?: boolean;
  showModulus?: boolean;
  showAngle?: boolean;
}

export function ArgandPlane({ z, showYAxis = true, showModulus = false, showAngle = false }: ArgandPlaneProps) {
  // SVG Coordinate System Setup
  const size = 500;
  const center = size / 2;
  const scale = 40; // pixels per unit
  
  // Transform math coordinates to SVG coordinates
  const toSvgX = (re: number) => center + re * scale;
  const toSvgY = (im: number) => center - im * scale; // Y is inverted in SVG

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#F7F7F8] rounded-2xl border border-[#E5E5E5] overflow-hidden p-8">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-[500px]"
      >
        {/* Grid Lines */}
        <g stroke="#E5E5E5" strokeWidth="1" opacity="0.5">
          {Array.from({ length: 13 }).map((_, i) => {
            const pos = i * scale + 10; // offset by 10 to center 12 units
            return (
              <g key={`grid-${i}`}>
                <line x1={pos} y1="0" x2={pos} y2={size} />
                <line x1="0" y1={pos} x2={size} y2={pos} />
              </g>
            );
          })}
        </g>

        {/* Real Axis (X) */}
        <line x1="0" y1={center} x2={size} y2={center} stroke="#111111" strokeWidth="2" />
        <text x={size - 20} y={center + 20} fontSize="14" fontFamily="serif" fill="#111111" fontStyle="italic">Re</text>

        {/* Imaginary Axis (Y) - Animated entrance */}
        <motion.g
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: showYAxis ? 1 : 0, scaleY: showYAxis ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        >
          <line x1={center} y1="0" x2={center} y2={size} stroke="#111111" strokeWidth="2" />
          <text x={center + 10} y="20" fontSize="14" fontFamily="serif" fill="#111111" fontStyle="italic">Im</text>
        </motion.g>

        {/* Complex Point and Vector */}
        {z && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Dashed projections */}
            <motion.line 
              x1={toSvgX(z.re)} y1={center} 
              x2={toSvgX(z.re)} y2={toSvgY(z.im)} 
              stroke="#666666" strokeWidth="1.5" strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.line 
              x1={center} y1={toSvgY(z.im)} 
              x2={toSvgX(z.re)} y2={toSvgY(z.im)} 
              stroke="#666666" strokeWidth="1.5" strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            {/* Modulus (Vector Line) */}
            <motion.line
              x1={center} y1={center}
              x2={toSvgX(z.re)} y2={toSvgY(z.im)}
              stroke="#2563EB" strokeWidth="2.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: showModulus ? 1 : 0, opacity: showModulus ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            
            {/* Angle Arc (Argument) */}
            {showAngle && (
              <motion.path
                d={`M ${center + scale * 1.5} ${center} A ${scale * 1.5} ${scale * 1.5} 0 0 0 ${toSvgX(z.re * 0.3)} ${toSvgY(z.im * 0.3)}`}
                fill="none"
                stroke="#E11D48"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            )}
            {showAngle && (
              <motion.text
                x={center + scale * 1.7}
                y={center - scale * 0.6}
                fontSize="16"
                fontFamily="serif"
                fill="#E11D48"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                θ
              </motion.text>
            )}

            {/* Point */}
            <motion.circle 
              cx={toSvgX(z.re)} cy={toSvgY(z.im)} 
              r="6" 
              fill="#2563EB" 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />

            {/* Coordinate Label */}
            <motion.text
              x={toSvgX(z.re) + 12} y={toSvgY(z.im) - 12}
              fontSize="14" fontFamily="serif" fill="#111111"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              z = {z.re} + {z.im}i
            </motion.text>
          </motion.g>
        )}
      </svg>
    </div>
  );
}
