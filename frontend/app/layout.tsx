import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRECOG — Predictive Causal Context Graph",
  description: "Live web intelligence with causal reasoning and prediction",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
