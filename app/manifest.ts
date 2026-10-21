import type { MetadataRoute } from "next";

/**
 * PWA manifest (T38, D23). Next serves this as `/manifest.webmanifest`; the
 * response headers in `next.config.ts` pin the manifest content type and keep
 * the file revalidated so install metadata updates with the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savings Tracker",
    short_name: "Savings",
    description:
      "Log income, split it across your own categories, and track expenses and savings in one private place.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f8f6",
    theme_color: "#047857",
    lang: "en",
    dir: "ltr",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Add income",
        short_name: "Income",
        description: "Log a paycheck or any money coming in.",
        url: "/income",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Add expense",
        short_name: "Expenses",
        description: "Log spending against an expense category.",
        url: "/expenses",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Add savings entry",
        short_name: "Savings",
        description: "Record a deposit or withdrawal.",
        url: "/savings",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
