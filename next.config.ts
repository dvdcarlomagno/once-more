import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
