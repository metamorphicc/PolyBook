import type { NextConfig } from "next";

const nextConfig = {
  turbopack: (config: any) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@phosphor-icons/webcomponents": false, 
    };
    return config;
  },
};

export default nextConfig;
