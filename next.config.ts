import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@opentelemetry/api'],
};

export default nextConfig;
