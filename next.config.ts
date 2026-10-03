import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8088";

const nextConfig: NextConfig = {
  // Remote dev through a VS Code dev tunnel (e.g. https://xxxx-3000.asse.devtunnels.ms)
  allowedDevOrigins: ["**.devtunnels.ms"],
  // Copilot and re-score calls can take longer than the default proxy timeout.
  experimental: { proxyTimeout: 120_000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
