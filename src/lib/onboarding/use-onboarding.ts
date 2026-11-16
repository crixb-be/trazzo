"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ONBOARDING_EVENT,
  ONBOARDING_KEY,
  parseOnboarding,
  type OnboardingState,
} from "./onboarding";

function read(): OnboardingState {
  try {
    return parseOnboarding(localStorage.getItem(ONBOARDING_KEY));
  } catch {
    // Storage blocked: do not nag on every screen.
    return { done: true, role: null, tools: [] };
  }
}

/** Welcome state shared by the first-run dialog, Home and Account. */
export function useOnboarding() {
  // `null` until the device storage has been read, so nothing flashes on load.
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    const sync = (): void => setState(read());
    sync();
    window.addEventListener(ONBOARDING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ONBOARDING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: OnboardingState): void => {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do: the choice lasts for this visit only.
    }
    setState(next);
    window.dispatchEvent(new Event(ONBOARDING_EVENT));
  }, []);

  return { state, save };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** The browser's own install prompt, when it offers one (Chrome and Edge). */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    const onPrompt = (event: Event): void => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return {
    installed,
    canPrompt: promptEvent !== null,
    install: async (): Promise<void> => {
      if (!promptEvent) return;
      await promptEvent.prompt();
      setPromptEvent(null);
    },
  };
}
