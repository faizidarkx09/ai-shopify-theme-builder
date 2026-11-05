import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE (Agent 1): create-next-app ne cacheComponents + partialPrefetching
  // on kiye the, lekin ye `export const runtime/dynamic` segment configs
  // (app/api/generate/route.ts, Agent 2) ke saath compatible nahi hain aur
  // build fail kar dete hain. Is app ko cache components ki zaroorat nahi,
  // is liye dono hata diye — route files ko chhede baghair.
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
