"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const isDark = localStorage.getItem("trazzo-theme") !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme(): void {
    const nextDark = !dark;
    setDark(nextDark);
    localStorage.setItem("trazzo-theme", nextDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", nextDark);
  }

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
