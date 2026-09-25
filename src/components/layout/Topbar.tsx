import { useEffect, useState } from "react";
import { Search, Sun, Moon, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { SearchModal } from "./SearchModal";
import { SyncStatusButton } from "@/components/common/SyncStatusButton";

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { lastSaved } = useData();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-400 transition hover:border-slate-300 sm:max-w-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-slate-600 dark:bg-slate-700">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {lastSaved && (
            <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> Sauvegardé
            </span>
          )}
          <SyncStatusButton />
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Changer de thème"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
