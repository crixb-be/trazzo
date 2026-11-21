"use client";

import type { ReactNode } from "react";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { WelcomeGuide } from "@/components/onboarding/WelcomeGuide";
import { FeedbackHost } from "@/components/ui/Feedback";

import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Header />
        <main className="page-content">
          <WelcomeGuide />
          {children}
        </main>
      </div>
      <BottomNav />
      <FeedbackHost />
      <Onboarding />
    </div>
  );
}
