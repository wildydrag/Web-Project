import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Without this, Turbopack walks up looking for a lockfile and can settle on
    // one outside the project (e.g. in the home directory), which makes module
    // resolution unpredictable. Pin the root to this app.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
