"use client";

import type { ReactNode } from "react";
import { AppBootstrap } from "./AppBootstrap";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppBootstrap />
      <Sidebar />
      <div className="main-shell">
        <Header />
        <main className="page-content">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
