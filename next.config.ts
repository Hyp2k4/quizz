import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPwaConfig(nextConfig);
