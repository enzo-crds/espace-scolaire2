import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  Trash2,
  Database,
  Cloud,
  RefreshCw,
} from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { exportDataAsJson, importDataFromJson } from "@/services/export";
import { estimateStorageUsage, humanFileSize } from "@/services/storage";
import {
  Field,
  inputClass,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from "@/components/common/FormField";
import type { ThemeMode } from "@/types";
import { SUBJECT_COLORS } from "@/types";
import {
  promptGoogleLogin,
  logoutGoogle,
  isGoogleConnected,
} from "@/services/gdrive";
import { NotificationToggle } from "@/components/common/NotificationToggle";
import { ReminderManager } from "@/components/reminders/ReminderManager";

export function SettingsPage() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  const {
    data,
    updateSettings,
    replaceAllData,
    resetAllData,
    syncWithDrive,
    isDriveSyncing,
  } = useData();

  const { notify, confirm } = useUI();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usage, setUsage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  useEffect(() => {
    estimateStorageUsage().then(setUsage);
  }, [data]);

  const themeOptions: {
    value: ThemeMode;
    label: string;
    icon: typeof Sun;
  }[] = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Système", icon: Laptop },
  ];

  const handleImport = async (file: File) => {
    try {
      const imported = await importDataFromJson(file);

      const ok = await confirm({
        title: "Remplacer toutes les données ?",
        message:
          "L'import va écraser vos données actuelles par celles du fichier sélectionné.",
        danger: true,
        confirmLabel: "Importer",
      });

      if (ok) {
        await replaceAllData(imported);
        notify("Données importées avec succès");
      }
    } catch {
      notify("Fichier invalide, import impossible", "error");
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Supprimer toutes les données ?",
      message:
        "Cette action supprimera définitivement toutes vos matières, cours, fiches, notes et votre emploi du temps.",
      danger: true,
      confirmLabel: "Tout supprimer",
    });

    if (ok) {
      await resetAllData();
      notify("Toutes les données ont été supprimées");
    }
  };

  return (
    <div className="max-w-2xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Paramètres
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Personnalisez votre espace scolaire.
        </p>
      </div>

      {/* Profil */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
          Profil
        </h2>

        <Field label="Nom / prénom affiché sur l'accueil">
          <input
            className={inputClass}
            value={data.settings.studentName}
            onChange={(event) => updateSettings({ studentName: event.target.value })}
            onBlur={(event) => {
              // Ne laisse jamais un nom vide : "Bonjour, 👋" serait bancal sur l'accueil
              if (!event.target.value.trim()) updateSettings({ studentName: "Élève" });
            }}
          />
        </Field>
      </section>

      {/* Notifications */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Rappels & Notifications
        </h2>

        <p className="mb-4 text-xs text-slate-400">
          Recevez les rappels de vos devoirs et cours directement sur votre
          écran verrouillé.
        </p>

        <NotificationToggle />
      </section>

      {/* Gestion des rappels */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <ReminderManager />
      </section>

      {/* Apparence */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
          Apparence
        </h2>

        <p className="mb-2 text-sm font-medium text-slate-500">Thème</p>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-medium transition ${
                theme === option.value
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                  : "border-slate-100 text-slate-500 dark:border-slate-700"
              }`}
            >
              <option.icon className="h-5 w-5" />
              {option.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-medium text-slate-500">
          Couleur d'accent
        </p>

        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Choisir la couleur ${color}`}
              onClick={() => setAccentColor(color)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                accentColor === color
                  ? "border-slate-900 dark:border-white"
                  : "border-transparent"
              }`}
              style={{ background: color }}
            />
          ))}
        </div>
      </section>

      {/* Synchronisation Google Drive */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          <Cloud className="h-5 w-5 text-[var(--accent)]" />
          Synchronisation Google Drive
        </h2>

        <p className="mb-4 text-xs text-slate-400">
          Connectez votre compte Google pour synchroniser automatiquement vos
          notes, cours et emploi du temps entre vos PC, téléphones et tablettes.
        </p>

        {isGoogleConnected() ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Cloud className="h-4 w-4" />
              Connecté à Google Drive (Synchro auto active)
            </span>

            <button
              type="button"
              className={btnSecondary}
              onClick={() => syncWithDrive()}
              disabled={isDriveSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isDriveSyncing ? "animate-spin" : ""
                }`}
              />
              Forcer la synchronisation
            </button>

            <button
              type="button"
              className="text-xs text-rose-500 hover:underline"
              onClick={() => {
                logoutGoogle();
                notify("Déconnecté de Google Drive");
              }}
            >
              Déconnecter
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => promptGoogleLogin()}
          >
            <Cloud className="h-4 w-4" />
            Se connecter avec Google
          </button>
        )}
      </section>

      {/* Données */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
          Données & sauvegarde
        </h2>

        <p className="mb-4 text-xs text-slate-400">
          Vos données sont enregistrées localement et synchronisées sur votre
          compte Google Drive. Vous pouvez également exporter ou importer un
          fichier JSON manuel.
        </p>

        {usage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900/50">
            <Database className="h-4 w-4 shrink-0" />
            Stockage utilisé : environ {humanFileSize(usage.usage)}
            {usage.quota
              ? ` sur ${humanFileSize(usage.quota)} disponibles`
              : ""}
            .
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => exportDataAsJson(data)}
          >
            <Download className="h-4 w-4" />
            Exporter mes données (JSON)
          </button>

          <button
            type="button"
            className={btnSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Importer une sauvegarde
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleImport(file);
              }

              event.target.value = "";
            }}
          />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700">
          <button
            type="button"
            className={btnDanger}
            onClick={() => void handleReset()}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer toutes les données
          </button>
        </div>
      </section>
    </div>
  );
}
