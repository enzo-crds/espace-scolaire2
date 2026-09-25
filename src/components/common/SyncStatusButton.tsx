import { RefreshCw, Cloud, LogIn } from "lucide-react";
import { useData } from "@/context/DataContext";
import { isGoogleConnected, promptGoogleLogin } from "@/services/gdrive";

export function SyncStatusButton() {
  const { isDriveSyncing, syncWithDrive } = useData();
  const connected = isGoogleConnected();

  const handleClick = async () => {
    if (!connected) {
      promptGoogleLogin();
    } else {
      await syncWithDrive();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDriveSyncing}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      title={connected ? "Cliquer pour forcer la synchro Drive" : "Connecter Google Drive"}
    >
      {isDriveSyncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
      ) : connected ? (
        <Cloud className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <LogIn className="h-3.5 w-3.5 text-amber-500" />
      )}
      <span className="hidden sm:inline">
        {isDriveSyncing ? "Sync..." : connected ? "Cloud synchro" : "Connecter Drive"}
      </span>
    </button>
  );
}
