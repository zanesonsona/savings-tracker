import type { ReactNode } from "react";
import Nav from "@/components/Nav";

// Authenticated app shell: top navigation + page container. Auth pages live in
// the sibling `(auth)` group and render without the nav (T24).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
