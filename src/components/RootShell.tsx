"use client";

import { ReactNode } from "react";
import { CornerAssistant } from "./CornerAssistant";

export default function RootShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 text-sm text-slate-100 sm:px-6 lg:px-8">
          <a className="text-base font-semibold text-white" href="/">
            iLLCoAiSpace
          </a>
          <nav className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-300">
            <a className="hover:text-white" href="/dashboard">
              Dashboard
            </a>
            <a className="hover:text-white" href="/assistant">
              Assistant
            </a>
            <a className="hover:text-white" href="/book">
              Book
            </a>
            <a className="hover:text-white" href="/masterwriter">
              MasterWriter
            </a>
            <a className="hover:text-white" href="/storyboard">
              Storyboard
            </a>
            <a className="hover:text-white" href="/login">
              Login
            </a>
          </nav>
        </div>
      </header>
      <div className="pt-16">{children}</div>
      <CornerAssistant />
    </>
  );
}
