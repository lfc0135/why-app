import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is on 0.0.0.0 while the browser uses 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
