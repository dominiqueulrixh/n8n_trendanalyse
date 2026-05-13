import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrendLens",
  description: "Instagram-inspirierte Content-Workbench für n8n"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-[#06070d] text-white antialiased">{children}</body>
    </html>
  );
}
