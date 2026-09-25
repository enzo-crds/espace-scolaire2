import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { generateId } from "@/services/id";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";

// ------------------------------------------------------------
// Toasts + Boîte de dialogue de confirmation, centralisés ici
// ------------------------------------------------------------

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface UIContextValue {
  notify: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const notify = useCallback((message: string, type: ToastType = "success") => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Si une confirmation est déjà ouverte, on la résout à "false" au lieu de laisser sa promesse pendante
      setConfirmState((prev) => {
        prev?.resolve(false);
        return { ...options, resolve };
      });
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        confirmState.resolve(false);
        setConfirmState(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmState]);

  const uiValue = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-sky-500" />,
    warning: <TriangleAlert className="h-5 w-5 text-amber-500" />,
  };

  return (
    <UIContext.Provider value={uiValue}>
      {children}

      {/* Conteneur de toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter pointer-events-auto flex items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-slate-800"
          >
            {icons[t.type]}
            <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Boîte de confirmation */}
      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{confirmState.title}</h3>
            {confirmState.message && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{confirmState.message}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {confirmState.cancelLabel || "Annuler"}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition ${
                  confirmState.danger
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-[var(--accent)] hover:opacity-90"
                }`}
              >
                {confirmState.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI doit être utilisé dans UIProvider");
  return ctx;
}
