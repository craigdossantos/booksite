import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Exclude venv directory from turbopack resolution
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },
  // Add venv to excluded paths
  outputFileTracingExcludes: {
    "*": ["venv/**/*"],
  },
};

export default nextConfig;
