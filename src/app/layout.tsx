import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hujurat Construction - Quotation & Invoice Management",
  description: "Professional Construction Quotation & Invoice Management System for Hujurat Construction Pty Ltd",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
