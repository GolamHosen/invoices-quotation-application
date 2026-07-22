import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side features for Vercel serverless
  // Only include server-side Node.js packages that need to be external
  serverExternalPackages: [
    "mongoose",
    "pdfmake",
    "nodemailer",
    "cloudinary",
    "bcryptjs",
    "jose",
    "xlsx",
  ],

  // Configure image remote patterns for Cloudinary
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Vercel uses its own serverless output format automatically
  // Do NOT set output: "standalone" as it conflicts with Vercel's build process

  // Enable server actions for form handling
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // Disable ETag generation for serverless (reduces response size)
  generateEtags: false,
};

export default nextConfig;
