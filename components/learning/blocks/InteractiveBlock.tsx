"use client";

import { Canvas } from "@react-three/fiber";
import type { GeoGebraInteractiveConfig, InteractiveBlock as InteractiveBlockData } from "@/lib/content/types/lesson";
import { ArgandPlane } from "@/components/math-viz/ArgandPlane";
import { CrossProductScene } from "@/components/3d/CrossProductScene";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";

function asVec3(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (value.every((item) => typeof item === "number")) {
    return [value[0], value[1], value[2]] as [number, number, number];
  }
  return null;
}

function isGeoGebraConfig(value: unknown): value is GeoGebraInteractiveConfig {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function InteractiveBlock({ provider, config }: InteractiveBlockData) {
  if (provider === "geogebra" && isGeoGebraConfig(config)) {
    return <GeoGebraProvider config={config} />;
  }

  if (provider === "custom" && config.visualizer === "argand-plane") {
    const point = config.z;
    const z = point && typeof point === "object" && "re" in point && "im" in point && typeof point.re === "number" && typeof point.im === "number" ? { re: point.re, im: point.im } : null;
    return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4"><ArgandPlane z={z} /></div>;
  }

  if (provider === "custom" && config.visualizer === "cross-product") {
    const v1 = asVec3(config.v1) ?? [3, 0, 0] as [number, number, number];
    const v2 = asVec3(config.v2) ?? [0, 2, 0] as [number, number, number];
    const showResult = typeof config.showResult === "boolean" ? config.showResult : false;

    return (
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">3D view</span>
          <span className="font-sans text-[10px] text-[#666666]">{showResult ? "Orthogonality visible" : "Vector setup"}</span>
        </div>
        <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-[#E5E5E5] bg-transparent">
          <Canvas camera={{ position: [3, 4, 8], fov: 45 }} className="h-full w-full">
            <CrossProductScene v1={v1} v2={v2} showResult={showResult} />
          </Canvas>
        </div>
      </div>
    );
  }

  return <div className="rounded-2xl border border-dashed border-[#D4D4D4] bg-[#F7F7F8] p-6 text-center font-sans text-sm text-[#666666]">Interactive {provider} content will appear here.</div>;
}
