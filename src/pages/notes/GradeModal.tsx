import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass, btnPrimary, btnSecondary } from "@/components/common/FormField";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import type { Grade } from "@/types";
import { normalizeGrade, round } from "@/services/calculations";

interface GradeModalProps {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  grade?: Grade | null;
}

export function GradeModal({ open, onClose, subjectId, grade }: GradeModalProps) {
  const { addGrade, updateGrade } = useData();
  const { notify } = useUI();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState(15);
  const [maxValue, setMaxValue] = useState(20);
  const [coefficient, setCoefficient] = useState(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(grade?.title || "");
      setValue(grade?.value ?? 15);
      setMaxValue(grade?.maxValue ?? 20);
      setCoefficient(grade?.coefficient ?? 1);
      setDate(grade?.date || new Date().toISOString().slice(0, 10));
      setDescription(grade?.description || "");
    }
  }, [open, grade]);

  const handleSubmit = () => {
    if (!title.trim()) return notify("Le titre de l'évaluation est obligatoire", "error");
    if (maxValue <= 0) return notify("Le barème doit être supérieur à 0", "error");
    if (value < 0 || value > maxValue) return notify(`La note doit être comprise entre 0 et ${maxValue}`, "error");
    if (coefficient <= 0) return notify("Le coefficient doit être supérieur à 0", "error");

    const payload = { subjectId, title: title.trim(), value, maxValue, coefficient, date, description: description.trim() };
    if (grade) {
      updateGrade(grade.id, payload);
      notify("Note modifiée");
    } else {
      addGrade(payload);
      notify("Note ajoutée avec succès");
    }
    onClose();
  };

  const normalized = round(normalizeGrade(value, maxValue), 1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={grade ? "Modifier la note" : "Ajouter une note"}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>Annuler</button>
          <button className={btnPrimary} onClick={handleSubmit}>{grade ? "Enregistrer" : "Ajouter"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Intitulé de l'évaluation">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Contrôle chapitre 3" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Note obtenue">
            <input type="number" step={0.25} className={inputClass} value={value} onChange={(e) => setValue(e.target.value === "" ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Sur (barème)">
            <input type="number" step={0.5} className={inputClass} value={maxValue} onChange={(e) => setMaxValue(e.target.value === "" ? 0 : Number(e.target.value))} />
          </Field>
        </div>

        {maxValue !== 20 && maxValue > 0 && (
          <p className="text-xs text-slate-400">Équivalent sur 20 : <strong>{normalized}/20</strong></p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Coefficient">
            <input type="number" step={0.5} min={0.5} className={inputClass} value={coefficient} onChange={(e) => setCoefficient(e.target.value === "" ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Description (optionnel)">
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
