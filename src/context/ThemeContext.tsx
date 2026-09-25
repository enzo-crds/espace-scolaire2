import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeMode } from "@/types";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // stockage indisponible (navigation privée stricte, cookies bloqués)
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignoré : la préférence ne sera simplement pas mémorisée */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = readPref("pref-theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });
  const [accentColor, setAccentColorState] = useState<string>(() => {
    const saved = readPref("pref-accent");
    return saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : "#6366f1";
  });
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.setProperty("--accent", accentColor);
  }, [resolvedTheme, accentColor]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    writePref("pref-theme", t);
  };

  const setAccentColor = (c: string) => {
    setAccentColorState(c);
    writePref("pref-accent", c);
  };

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, accentColor, setAccentColor }),
    [theme, resolvedTheme, accentColor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans ThemeProvider");
  return ctx;
}
