import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Full-Funnel Ad Decision Matrix",
  description: "Score and classify paid media ads by funnel stage — Scale, Iterate, Monitor, or Kill.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080810] text-gray-100">{children}</body>
    </html>
  );
}
