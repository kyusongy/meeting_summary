import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The target VM has under 1 GB of RAM and can't run `next build`, so we
  // build here and ship the self-contained server.
  output: "standalone",
};

export default nextConfig;
