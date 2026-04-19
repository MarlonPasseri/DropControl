import type { NextConfig } from "next";

const safeActionOrigins = [process.env.APP_URL, process.env.NEXTAUTH_URL]
  .filter((value): value is string => Boolean(value))
  .flatMap((value) => {
    try {
      return [new URL(value).host];
    } catch {
      return [];
    }
  });

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "6mb",
    serverActions: {
      bodySizeLimit: "6mb",
      ...(safeActionOrigins.length > 0 ? { allowedOrigins: safeActionOrigins } : {}),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
