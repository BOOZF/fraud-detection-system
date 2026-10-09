import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8088";

const nextConfig: NextConfig = {
  // Remote dev through a VS Code dev tunnel (e.g. https://xxxx-3000.asse.devtunnels.ms)
  allowedDevOrigins: ["**.devtunnels.ms"],
  // Copilot and re-score calls can take longer than the default proxy timeout.
  // Document uploads: the backend accepts up to 25 MB, so let the proxy buffer more than its 10 MB default.
  experimental: { proxyTimeout: 120_000, proxyClientMaxBodySize: "30mb" },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
