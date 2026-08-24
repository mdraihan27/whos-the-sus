import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.0.3'],
};

export default withSerwist(nextConfig);
