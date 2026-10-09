import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow GSAP SplitText and other client-only libs to work
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // Lessons with many interactive boards exceed the 1MB default when saved from the admin editor.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
