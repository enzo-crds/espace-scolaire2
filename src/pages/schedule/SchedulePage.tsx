import { useMemo, useState, useEffect } from "react";
import { Plus, MapPin, User, Copy } from "lucide-react";
import { useData } from "@/context/DataContext";
import type { ScheduleSlot, Week } from "@/types";
import { DAYS, timeToMinutes, minutesToTime, currentDayIndex } from "@/utils/date";
import { SlotModal } from "./SlotModal";
import { EmptyState } from "@/components/common/EmptyState";
import { btnPrimary, btnSecondary } from "@/components/common/FormField";

const DAY_START = 8 * 60; // 08:00
const DAY_END = 17 * 60 + 20; // 17:20 (1040 min)
const PX_PER_MIN = 1.2;
const WORKWEEK_DAYS = DAYS.slice(0, 5); // Lundi -> Vendredi

const SCHOOL_SLOTS: [string, string][] = [
  ["08:00", "08:55"], // 1ère heure
  ["08:55", "09:50"], // 2ème heure (pause 9:50-10:05)
  ["10:05", "11:00"], // 3ème heure
  ["11:00", "11:55"], // 4ème heure
  ["12:00", "12:55"], // 5ème heure (début midi)
  ["12:55", "13:25"], // 6ème créneau court / reprise
  ["13:25", "14:20"], // 7ème heure
  ["14:20", "15:15"], // 8ème heure (pause 15:15-15:30)
  ["15:30", "16:25"], // 9ème heure
  ["16:25", "17:20"], // 10ème heure (fin 17:20)
];

export function SchedulePage() {
  const { data, updateSlot, updateSettings, copyWeekSchedule } = useData();
  const [weekView, setWeekView] = useState<Week>(data.settings.currentWeek);
  const [mobileDay, setMobileDay] = useState(() => Math.min(currentDayIndex(), 4));
  const [modal, setModal] = useState<{ open: boolean; slot?: ScheduleSlot | null; day?: number; defaultStart?: string; defaultEnd?: string }>({ open: false });
  const [dragId, setDragId] = useState<string | null>(null);
  
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const visibleSlots = useMemo(
    () => data.schedule.filter((s) => s.week === "BOTH" || s.week === weekView),
    [data.schedule, weekView]
  );

  const subjectOf = (id: string | null) => data.subjects.find((s) => s.id === id);

  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  const hourMarks: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hourMarks.push(m);

  const handleDrop = (day: number, clientY: number, containerTop: number) => {
    if (!dragId) return;
    const slot = data.schedule.find((s) => s.id === dragId);
    if (!slot) return;
    const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
    const offsetMin = (clientY - containerTop) / PX_PER_MIN;
    let newStart = Math.round((DAY_START + offsetMin) / 5) * 5;
    newStart = Math.max(DAY_START, Math.min(newStart, DAY_END - duration));
    updateSlot(slot.id, { day, start: minutesToTime(newStart), end: minutesToTime(newStart + duration) });
    setDragId(null);
  };

  const handleDoubleClickGrid = (dayIdx: number, clientY: number, containerTop: number) => {
    const offsetMin = (clientY - containerTop) / PX_PER_MIN;
    const clickedMin = DAY_START + offsetMin;

    const matched = SCHOOL_SLOTS.find(([start, end]) => {
      const sMin = timeToMinutes(start);
      const eMin = timeToMinutes(end);
      return clickedMin >= sMin - 15 && clickedMin <= eMin + 15;
    }) || SCHOOL_SLOTS[0];

    setModal({
      open: true,
      day: dayIdx,
      defaultStart: matched[0],
      defaultEnd: matched[1],
    });
  };

  const handleCopyWeek = () => {
    if (weekView === "BOTH") return;
    const targetWeek: "A" | "B" = weekView === "A" ? "B" : "A";
    const labelTarget = targetWeek === "A" ? "Pair" : "Impair";
    const labelSource = weekView === "A" ? "Pair" : "Impair";
    if (window.confirm(`Copier la Semaine ${labelSource} vers la Semaine ${labelTarget} ? Cela écrasera les créneaux spécifiques de la semaine ${labelTarget}.`)) {
      copyWeekSchedule(weekView, targetWeek);
    }
  };

  const renderSlotCard = (slot: ScheduleSlot, compact = false) => {
    const subject = subjectOf(slot.subjectId);
    const color = slot.color || subject?.color || "#6366f1";
    return (
      <button
        draggable={!compact}
        onDragStart={() => setDragId(slot.id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => setModal({ open: true, slot })}
        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border-l-4 bg-white px-2 py-1.5 text-left shadow-sm transition hover:shadow-md dark:bg-slate-800"
        style={{ borderColor: color }}
      >
        <p className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
          {subject ? `${subject.icon} ${subject.name}` : slot.label}
        </p>
        <p className="truncate text-[10px] text-slate-400">{slot.start}–{slot.end}{slot.room ? ` · ${slot.room}` : ""}</p>
      </button>
    );
  };

  const isTimeVisible = nowMinutes >= DAY_START && nowMinutes <= DAY_END;
  const nowTop = (nowMinutes - DAY_START) * PX_PER_MIN;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Emploi du temps</h1>
          <p className="mt-1 text-sm text-slate-400">8:00 – 17:20 · Double-cliquez sur une case pour ajouter un cours.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {weekView !== "BOTH" && (
            <button className={btnSecondary} onClick={handleCopyWeek}>
              <Copy className="h-3.5 w-3.5" /> Copier vers sem. {weekView === "A" ? "Impair" : "Pair"}
            </button>
          )}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium dark:bg-slate-800">
            {(
              [
                { key: "A" as const, label: "Pair" },
                { key: "B" as const, label: "Impair" },
              ] as const
            ).map((w) => (
              <button
                key={w.key}
                onClick={() => {
                  setWeekView(w.key);
                  updateSettings({ currentWeek: w.key });
                }}
                className={`rounded-md px-3 py-1.5 transition ${weekView === w.key ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}
              >
                Semaine {w.label}
              </button>
            ))}
          </div>
          <button className={btnPrimary} onClick={() => setModal({ open: true, day: Math.min(mobileDay, 4) })}>
            <Plus className="h-4 w-4" /> Créneau
          </button>
        </div>
      </div>

      {data.schedule.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="Votre emploi du temps est vide"
          description="Ajoutez votre premier créneau de cours."
          action={<button className={btnPrimary} onClick={() => setModal({ open: true, day: 0 })}><Plus className="h-4 w-4" /> Ajouter un créneau</button>}
        />
      ) : (
        <>
          {/* Vue grille — bureau/tablette (5 jours) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-800 md:block">
            <div className="grid min-w-[700px] grid-cols-[50px_repeat(5,1fr)] gap-2">
              <div />
              {WORKWEEK_DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-300">{d}</div>
              ))}

              <div className="relative" style={{ height: gridHeight }}>
                {hourMarks.map((m) => (
                  <div key={m} className="absolute right-1 -translate-y-2 text-[10px] text-slate-300" style={{ top: (m - DAY_START) * PX_PER_MIN }}>
                    {minutesToTime(m)}
                  </div>
                ))}
              </div>

              {WORKWEEK_DAYS.map((_, dayIdx) => (
                <div
                  key={dayIdx}
                  className="group relative rounded-lg bg-slate-50/60 dark:bg-slate-900/30"
                  style={{ height: gridHeight }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleDrop(dayIdx, e.clientY, rect.top);
                  }}
                  onDoubleClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleDoubleClickGrid(dayIdx, e.clientY, rect.top);
                  }}
                >
                  {hourMarks.map((m) => (
                    <div key={m} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-700/50" style={{ top: (m - DAY_START) * PX_PER_MIN }} />
                  ))}
                  
                  {/* Ligne rouge de l'heure actuelle, uniquement sur la colonne du jour */}
                  {isTimeVisible && dayIdx === currentDayIndex() && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: nowTop }}
                    >
                      <div className="h-2 w-2 -translate-x-1 rounded-full bg-rose-500" />
                      <div className="h-[2px] w-full bg-rose-500" />
                    </div>
                  )}

                  {visibleSlots
                    .filter((s) => s.day === dayIdx)
                    .map((s) => {
                      const startMin = Math.max(DAY_START, timeToMinutes(s.start));
                      const endMin = Math.min(DAY_END, Math.max(timeToMinutes(s.end), startMin + 20));
                      const top = (startMin - DAY_START) * PX_PER_MIN;
                      const height = Math.max(28, (endMin - startMin) * PX_PER_MIN);
                      return (
                        <div key={s.id} className="absolute inset-x-0.5 z-10" style={{ top, height }}>
                          {renderSlotCard(s)}
                        </div>
                      );
                    })}
                  <button
                    onClick={() => setModal({ open: true, day: dayIdx })}
                    className="absolute bottom-1 right-1 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow transition hover:text-[var(--accent)] group-hover:opacity-100 hover:opacity-100 dark:bg-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Vue liste — mobile (5 jours) */}
          <div className="md:hidden">
            <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
              {WORKWEEK_DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setMobileDay(i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    mobileDay === i ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {visibleSlots
                .filter((s) => s.day === mobileDay)
                .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
                .map((s) => {
                  const subject = subjectOf(s.subjectId);
                  const color = s.color || subject?.color || "#6366f1";
                  return (
                    <button
                      key={s.id}
                      onClick={() => setModal({ open: true, slot: s })}
                      className="flex w-full items-center gap-3 rounded-xl border-l-4 bg-white p-3 text-left shadow-sm dark:bg-slate-800"
                      style={{ borderColor: color }}
                    >
                      <div className="w-14 shrink-0 text-xs font-semibold text-slate-500">
                        {s.start}<br />{s.end}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {subject ? `${subject.icon} ${subject.name}` : s.label}
                        </p>
                        <div className="mt-0.5 flex gap-3 text-[11px] text-slate-400">
                          {s.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</span>}
                          {s.teacher && <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.teacher}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              {visibleSlots.filter((s) => s.day === mobileDay).length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">Aucun cours ce jour-là.</p>
              )}
            </div>
            <button className={`${btnSecondary} mt-3 w-full`} onClick={() => setModal({ open: true, day: mobileDay })}>
              <Plus className="h-4 w-4" /> Ajouter un créneau ce jour
            </button>
          </div>
        </>
      )}

      <SlotModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        slot={modal.slot}
        defaultDay={modal.day}
        defaultWeek={weekView}
        defaultStart={modal.defaultStart}
        defaultEnd={modal.defaultEnd}
      />
    </div>
  );
}
