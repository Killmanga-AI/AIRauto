import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIRAuto SA – Invoice Automation for South African SMEs",
  description:
    "Production-grade invoice automation for South African accounting firms and SMEs. OCR, SARS validation, and export-ready data for your ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background text-foreground antialiased",
          inter.className,
        )}
      >
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <HeaderBar />
            <main className="flex-1 px-6 pb-8 pt-6 lg:px-10">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

