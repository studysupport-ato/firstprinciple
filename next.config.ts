import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow GSAP SplitText and other client-only libs to work
  experimental: {
    proxyClientMaxBodySize: "11mb",
    serverActions: {
      bodySizeLimit: "11mb",
    },
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
