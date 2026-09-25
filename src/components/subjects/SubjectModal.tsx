import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass, btnPrimary, btnSecondary } from "@/components/common/FormField";
import type { Subject } from "@/types";
import { SUBJECT_COLORS, SUBJECT_ICONS } from "@/types";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { btnDanger } from "@/components/common/FormField";

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
}

export function SubjectModal({ open, onClose, subject }: SubjectModalProps) {
  const { addSubject, updateSubject, deleteSubject } = useData();
  const { notify, confirm } = useUI();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState(SUBJECT_ICONS[0]);
  const [coefficient, setCoefficient] = useState(1);

  useEffect(() => {
    if (open) {
      setName(subject?.name || "");
      setColor(subject?.color || SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
      setIcon(subject?.icon || SUBJECT_ICONS[Math.floor(Math.random() * SUBJECT_ICONS.length)]);
      setCoefficient(subject?.coefficient ?? 1);
    }
  }, [open, subject]);

  const handleSubmit = () => {
    if (!name.trim()) {
      notify("Le nom de la matière est obligatoire", "error");
      return;
    }
    if (!(coefficient > 0)) {
      notify("Le coefficient doit être supérieur à 0", "error");
      return;
    }
    // Ne pas écraser les autres champs (ex: intercalaires) : on ne met à jour que ce que ce formulaire édite
    const payload = { name: name.trim(), color, icon, coefficient };
    if (subject) {
      updateSubject(subject.id, payload);
      notify("Matière modifiée");
    } else {
      addSubject(payload);
      notify("Matière créée avec succès");
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!subject) return;
    const ok = await confirm({
      title: `Supprimer la matière « ${subject.name} » ?`,
      message: "Ses cours, fiches, exercices, notes, devoirs et fichiers seront aussi supprimés. Cette action est irréversible.",
      danger: true,
      confirmLabel: "Tout supprimer",
    });
    if (!ok) return;
    deleteSubject(subject.id);
    notify("Matière supprimée");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? "Modifier la matière" : "Nouvelle matière"}
      footer={
        <>
          {subject && <button className={`${btnDanger} mr-auto`} onClick={() => void handleDelete()}>Supprimer</button>}
          <button className={btnSecondary} onClick={onClose}>Annuler</button>
          <button className={btnPrimary} onClick={handleSubmit}>{subject ? "Enregistrer" : "Créer"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom de la matière">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Mathématiques" />
        </Field>

        <Field label="Coefficient de la matière" hint="Utilisé pour la moyenne générale pondérée.">
          <input
            type="number"
            min={0.5}
            step={0.5}
            className={inputClass}
            value={coefficient}
            onChange={(e) => setCoefficient(Number(e.target.value))}
          />
        </Field>

        <Field label="Couleur">
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Couleur ${c}`}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-slate-900 dark:border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>

        <Field label="Icône">
          <div className="flex flex-wrap gap-2">
            {SUBJECT_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  icon === ic ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-slate-200 dark:border-slate-600"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
