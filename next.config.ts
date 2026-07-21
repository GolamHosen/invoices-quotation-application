import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side features for Vercel
  serverExternalPackages: ["mongoose", "pdfmake", "nodemailer", "cloudinary"],

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

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
