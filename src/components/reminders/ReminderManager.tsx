import { useState } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { DAYS } from "@/utils/date";
import { generateId } from "@/services/id";
import type { Reminder } from "@/types";
import { btnPrimary, btnSecondary, inputClass, Field } from "@/components/common/FormField";
import { Modal } from "@/components/common/Modal";

export function ReminderManager() {
  const { data, setReminders } = useData();
  const { notify } = useUI();
  const reminders = data.reminders;

  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("07:30");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Lundi -> Vendredi par défaut

  const handleToggle = (id: string) => {
    setReminders(reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDelete = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
    notify("Rappel supprimé");
  };

  const handleAdd = () => {
    if (!title.trim()) {
      notify("Saisissez un titre pour l'alarme", "error");
      return;
    }

    const newReminder: Reminder = {
      id: generateId(),
      title: title.trim(),
      time: time || "07:30",
      days: selectedDays,
      enabled: true,
      type: "REMINDER",
    };

    setReminders([...reminders, newReminder]);

    setTitle("");
    setOpenModal(false);
    notify("Rappel ajouté");
  };

  const toggleDay = (dayIdx: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Alarmes & Rappels personnalisés</h3>
          <p className="text-xs text-slate-400">Programmez des sonneries et rappels récurrents.</p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setOpenModal(true)}
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {reminders.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">Aucune alarme configurée.</p>
        ) : (
          reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {r.time} — {r.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {r.days.length === 0 || r.days.length === 7
                      ? "Tous les jours"
                      : r.days.length === 5 && [0, 1, 2, 3, 4].every((d) => r.days.includes(d))
                      ? "En semaine"
                      : [...r.days].sort((a, b) => a - b).map((d) => DAYS[d].slice(0, 3)).join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => handleToggle(r.id)}
                  className="h-5 w-5 cursor-pointer rounded accent-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-slate-400 transition hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Nouveau rappel / alarme"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setOpenModal(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={handleAdd}
            >
              Enregistrer
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Titre du rappel">
            <input
              className={inputClass}
              placeholder="Ex : Réveil pour les cours, Préparer le sac..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Heure">
            <input
              type="time"
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>

          <Field label="Répétition">
            <div className="flex flex-wrap gap-1">
              {DAYS.map((d, idx) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedDays.includes(idx)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
