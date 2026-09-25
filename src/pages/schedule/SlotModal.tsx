import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass, btnPrimary, btnSecondary, btnDanger } from "@/components/common/FormField";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import type { ScheduleSlot, Week } from "@/types";
import { SUBJECT_COLORS } from "@/types";
import { DAYS, timeToMinutes, minutesToTime } from "@/utils/date";

interface SlotModalProps {
  open: boolean;
  onClose: () => void;
  slot?: ScheduleSlot | null;
  defaultDay?: number;
  defaultWeek?: Week;
  defaultStart?: string;
  defaultEnd?: string;
}

export function SlotModal({ open, onClose, slot, defaultDay = 0, defaultWeek = "BOTH", defaultStart, defaultEnd }: SlotModalProps) {
  const { data, addSlot, updateSlot, deleteSlot } = useData();
  const { notify, confirm } = useUI();

  const [week, setWeek] = useState<Week>("BOTH");
  const [day, setDay] = useState(0);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");
  const [subjectId, setSubjectId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  useEffect(() => {
    if (open) {
      setWeek(slot?.week || defaultWeek);
      setDay(slot?.day ?? defaultDay);
      const initialStart = slot?.start || defaultStart || "08:00";
      setStart(initialStart);
      if (slot?.end) {
        setEnd(slot.end);
      } else if (defaultEnd) {
        setEnd(defaultEnd);
      } else {
        const startMin = timeToMinutes(initialStart);
        setEnd(minutesToTime(Math.min(1040, startMin + 60))); // +1h ou plafonné à 17:20 (1040 min)
      }
      setSubjectId(slot?.subjectId || "");
      setLabel(slot?.label || "");
      setRoom(slot?.room || "");
      setTeacher(slot?.teacher || "");
      setColor(slot?.color || SUBJECT_COLORS[0]);
    }
  }, [open, slot, defaultDay, defaultWeek, defaultStart, defaultEnd]);

  const handleSubmit = () => {
    if (!subjectId && !label.trim()) return notify("Choisissez une matière ou saisissez un libellé", "error");
    if (start >= end) return notify("L'heure de fin doit être après l'heure de début", "error");

    const payload = {
      week,
      day,
      start,
      end,
      subjectId: subjectId || null,
      label: label.trim() || undefined,
      room: room.trim() || undefined,
      teacher: teacher.trim() || undefined,
      color: subjectId ? data.subjects.find((s) => s.id === subjectId)?.color : color,
    };

    if (slot) {
      updateSlot(slot.id, payload);
      notify("Créneau modifié");
    } else {
      addSlot(payload);
      notify("Créneau ajouté");
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!slot) return;
    const ok = await confirm({ title: "Supprimer ce créneau ?", danger: true, confirmLabel: "Supprimer" });
    if (ok) {
      deleteSlot(slot.id);
      notify("Créneau supprimé");
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={slot ? "Modifier le créneau" : "Nouveau créneau"}
      footer={
        <>
          {slot && <button className={btnDanger} onClick={handleDelete}>Supprimer</button>}
          <button className={btnSecondary} onClick={onClose}>Annuler</button>
          <button className={btnPrimary} onClick={handleSubmit}>{slot ? "Enregistrer" : "Ajouter"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jour">
            <select className={inputClass} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAYS.slice(0, 5).map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Semaine">
            <select className={inputClass} value={week} onChange={(e) => setWeek(e.target.value as Week)}>
              <option value="BOTH">Toutes les semaines</option>
              <option value="A">Semaine Pair</option>
              <option value="B">Semaine Impair</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Début">
            <input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin">
            <input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="Matière">
          <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">— Libellé personnalisé —</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
        </Field>

        {!subjectId && (
          <Field label="Libellé">
            <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Permanence" />
          </Field>
        )}

        {!subjectId && (
          <Field label="Couleur">
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-slate-900 dark:border-white" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salle (optionnel)">
            <input className={inputClass} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex : 204" />
          </Field>
          <Field label="Professeur (optionnel)">
            <input className={inputClass} value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Ex : Mme Martin" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
