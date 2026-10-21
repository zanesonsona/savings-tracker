import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import PwaRegister from "@/components/PwaRegister";
import { ToastProvider } from "@/components/Toaster";
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
  applicationName: "Savings Tracker",
  title: "Savings Tracker",
  description:
    "Log income, split it across your own categories, and track expenses and savings in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Savings Tracker",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

// T38 — keep zoom enabled (no maximum-scale / user-scalable overrides) while
// letting the installed app paint under the iOS safe areas.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#047857" },
    { media: "(prefers-color-scheme: dark)", color: "#064e3b" },
  ],
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
      <body className="flex min-h-full flex-col bg-surface-muted text-ink">
        <ToastProvider>
          <InstallPrompt />
          <PwaRegister />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
