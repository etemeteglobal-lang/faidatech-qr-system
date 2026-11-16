import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Next.js dev checks the host of Preview and local client resources before hydrating interactive components.
  allowedDevOrigins: [
    "3000-i11q1wk9qe4i3c35xfo0b-b1d01494.us5.manus.computer",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
