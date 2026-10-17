import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Savings Tracker",
  description:
    "Log income, split it across your own categories, and track expenses and savings in one place.",
};

// T31 — runs synchronously in <head> before first paint, so the stored theme
// (or the OS preference under "system") is on <html> before anything renders.
// The ThemeToggle client component keeps it in sync afterwards.
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("st-theme");var pref=(p==="light"||p==="dark")?p:"system";var d=pref==="dark"||(pref==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=pref;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-surface-muted text-ink">{children}</body>
    </html>
  );
}
