import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, ArrowLeft, Star, Trash2, FileText, FolderPlus, X } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import type { DocKind, DocumentItem, Subject } from "@/types";
import { EmptyState } from "@/components/common/EmptyState";
import { SubjectModal } from "@/components/subjects/SubjectModal";
import { NewDocumentModal } from "./NewDocumentModal";
import { btnPrimary, btnSecondary } from "@/components/common/FormField";

interface DocumentsPageProps {
  kind: DocKind;
}

const DEFAULT_TABS = ["Cours", "Exercices", "Évals", "Fiches"];

const LABELS: Record<DocKind, { title: string; singular: string; empty: string; newBtn: string }> = {
  course: { title: "Cours", singular: "cours", empty: "Aucun cours pour cet intercalaire.", newBtn: "Nouveau cours" },
  fiche: { title: "Fiches de révision", singular: "fiche", empty: "Aucune fiche de révision pour cet intercalaire.", newBtn: "Nouvelle fiche" },
  exercise: { title: "Exercices", singular: "exercice", empty: "Aucun exercice pour cet intercalaire.", newBtn: "Nouvel exercice" },
};

const getBasePath = (kind: DocKind) => {
  switch (kind) {
    case "course": return "cours";
    case "exercise": return "exercices";
    case "fiche":
    default: return "fiches";
  }
};

const pluralize = (count: number, singular: string) => {
  if (count <= 1) return singular;
  return singular.endsWith("s") ? singular : `${singular}s`;
};

export function DocumentsPage({ kind }: DocumentsPageProps) {
  const { data, deleteDocument, updateDocument, updateSubject } = useData();
  const { confirm, notify } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get("matiere");
  
  const [search, setSearch] = useState("");
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Cours");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  const selectedSubject: Subject | undefined = data.subjects.find((s) => s.id === subjectId);
  // useMemo : sans lui, un nouveau tableau par rendu invalide tous les useMemo/useEffect en aval
  const subjectTabs: string[] = useMemo(
    () => (selectedSubject?.tabs && selectedSubject.tabs.length > 0 ? selectedSubject.tabs : DEFAULT_TABS),
    [selectedSubject?.tabs]
  );

  useEffect(() => {
    if (subjectId && subjectTabs.length > 0) {
      setActiveTab((prev) => (subjectTabs.includes(prev) ? prev : subjectTabs[0]));
    }
  }, [subjectId, subjectTabs]);

  useEffect(() => {
    const state = location.state as { openNew?: boolean; openSubject?: boolean } | null;
    if (state?.openNew) {
      if (data.subjects.length === 0) setSubjectModalOpen(true);
      else setNewDocOpen(true);
    }
    if (state?.openSubject) setSubjectModalOpen(true);
    if (state) navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = LABELS[kind];
  const docs = useMemo(() => data.documents.filter((d) => d.kind === kind), [data.documents, kind]);

  const subjectsWithCount = data.subjects.map((s) => ({
    subject: s,
    count: docs.filter((d) => d.subjectId === s.id).length,
  }));

  const filteredDocs = useMemo(() => {
    let list = docs;
    if (subjectId) {
      list = list.filter((d) => d.subjectId === subjectId);
      // Un document rangé dans un intercalaire supprimé retombe dans le premier intercalaire
      // (sinon il devenait invisible et impossible à retrouver)
      list = list.filter((d) => {
        const tab = d.tab && subjectTabs.includes(d.tab) ? d.tab : subjectTabs[0];
        return tab === activeTab;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.description?.toLowerCase().includes(q)
      );
    }
    // Favoris d'abord, puis les plus récemment modifiés
    return [...list].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.updatedAt - a.updatedAt);
  }, [docs, subjectId, search, activeTab, subjectTabs]);

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: `Supprimer « ${title} » ?`,
      message: "Cette action est irréversible.",
      danger: true,
      confirmLabel: "Supprimer",
    });
    if (ok) {
      deleteDocument(id);
      notify(`${label.singular.charAt(0).toUpperCase() + label.singular.slice(1)} supprimé(e)`);
    }
  };

  const handleAddTab = () => {
    const trimmed = newTabName.trim();
    if (!trimmed || subjectTabs.includes(trimmed)) return;
    const updatedTabs = [...subjectTabs, trimmed];
    if (subjectId) updateSubject(subjectId, { tabs: updatedTabs });
    setActiveTab(trimmed);
    setNewTabName("");
    setIsAddingTab(false);
    notify(`Intercalaire « ${trimmed} » ajouté`);
  };

  const handleDeleteTab = async (tabToDelete: string) => {
    if (subjectTabs.length <= 1) {
      notify("Il faut garder au moins un intercalaire", "warning");
      return;
    }
    const ok = await confirm({
      title: `Supprimer l'intercalaire « ${tabToDelete} » ?`,
      message: "Les documents de cet intercalaire ne seront pas supprimés.",
      danger: true,
      confirmLabel: "Supprimer l'intercalaire",
    });
    if (ok) {
      const updatedTabs = subjectTabs.filter((t) => t !== tabToDelete);
      if (subjectId) updateSubject(subjectId, { tabs: updatedTabs });
      setActiveTab(updatedTabs[0]);
      notify(`Intercalaire « ${tabToDelete} » supprimé`);
    }
  };

  const basePath = getBasePath(kind);

  // --- Vue "liste des matières" ---
  if (!subjectId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{label.title}</h1>
            <p className="mt-1 text-sm text-slate-400">Organisez vos {pluralize(2, label.singular)} par matière.</p>
          </div>
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={() => setSubjectModalOpen(true)}>
              <Plus className="h-4 w-4" /> Matière
            </button>
            <button
              className={btnPrimary}
              onClick={() => {
                if (data.subjects.length === 0) {
                  notify("Créez d'abord une matière", "warning");
                  setSubjectModalOpen(true);
                  return;
                }
                setNewDocOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {label.newBtn}
            </button>
          </div>
        </div>

        {data.subjects.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Aucune matière créée"
            description="Créez votre première matière pour commencer à organiser vos contenus."
            action={
              <button className={btnPrimary} onClick={() => setSubjectModalOpen(true)}>
                <Plus className="h-4 w-4" /> Créer une matière
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjectsWithCount.map(({ subject, count }) => (
              <button
                key={subject.id}
                onClick={() => setParams({ matiere: subject.id })}
                className="card-hover flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-800"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ background: `${subject.color}20` }}
                >
                  {subject.icon}
                </span>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{subject.name}</p>
                  <p className="text-xs text-slate-400">
                    {count} {pluralize(count, label.singular)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <SubjectModal open={subjectModalOpen} onClose={() => setSubjectModalOpen(false)} />
        <NewDocumentModal
          open={newDocOpen}
          onClose={() => setNewDocOpen(false)}
          kind={kind}
          defaultSubjectId={subjectId}
          onCreated={(id) => navigate(`/${basePath}/${id}`)}
        />
      </div>
    );
  }

  // --- Vue "documents d'une matière" ---
  return (
    <div className="space-y-6">
      <button
        onClick={() => setParams({})}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les matières
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: `${selectedSubject?.color}20` }}>
            {selectedSubject?.icon}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedSubject?.name}</h1>
            <p className="text-sm text-slate-400">
              Intercalaire : <strong className="text-slate-700 dark:text-slate-200">{activeTab}</strong> · {filteredDocs.length} {pluralize(filteredDocs.length, label.singular)}
            </p>
          </div>
        </div>
        <button className={btnPrimary} onClick={() => setNewDocOpen(true)}>
          <Plus className="h-4 w-4" /> {label.newBtn}
        </button>
      </div>

      {/* Barre des intercalaires */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {/* Menu mobile */}
          <div className="sm:hidden w-full mb-1">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
            >
              {subjectTabs.map((tab) => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </select>
          </div>

          {/* Onglets desktop */}
          <div className="hidden sm:flex flex-wrap items-center gap-1">
            {subjectTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <div key={tab} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-t-xl px-4 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                  {subjectTabs.length > 1 && (
                    <button
                      onClick={() => handleDeleteTab(tab)}
                      className={`ml-0.5 rounded-r-lg p-1 text-[10px] transition opacity-0 group-hover:opacity-100 ${
                        isActive ? "text-white/80 hover:bg-white/20" : "text-slate-400 hover:text-rose-500"
                      }`}
                      title={`Supprimer ${tab}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ajout d'intercalaire */}
          {isAddingTab ? (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="text"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Nom..."
                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddTab()}
              />
              <button onClick={handleAddTab} className="rounded-lg bg-emerald-500 p-1 text-white text-xs">✓</button>
              <button onClick={() => setIsAddingTab(false)} className="rounded-lg bg-slate-200 p-1 text-slate-600 text-xs dark:bg-slate-700 dark:text-slate-300">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTab(true)}
              className="flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
            >
              <FolderPlus className="h-3.5 w-3.5" /> + Intercalaire
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher un(e) ${label.singular}, un tag…`}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={label.empty}
          description={`Aucun(e) ${label.singular} dans l'intercalaire « ${activeTab} ».`}
          action={
            <button className={btnPrimary} onClick={() => setNewDocOpen(true)}>
              <Plus className="h-4 w-4" /> {label.newBtn}
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc: DocumentItem) => (
            <div
              key={doc.id}
              className="card-hover group flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800"
              onClick={() => navigate(`/${basePath}/${doc.id}`)}
            >
              <div className="flex items-start justify-between">
                <h3 className="line-clamp-2 pr-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{doc.title}</h3>
                <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => updateDocument(doc.id, { favorite: !doc.favorite })}
                    className="rounded-lg p-1 text-slate-300 hover:text-amber-400"
                  >
                    <Star className={`h-4 w-4 ${doc.favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="rounded-lg p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {doc.description && (
                <p className="line-clamp-2 text-xs text-slate-400">{doc.description}</p>
              )}

              {/* Sélecteur de déplacement d'intercalaire */}
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-slate-400">Intercalaire :</span>
                <select
                  value={doc.tab && subjectTabs.includes(doc.tab) ? doc.tab : subjectTabs[0]}
                  onChange={(e) => {
                    updateDocument(doc.id, { tab: e.target.value });
                    notify(`Déplacé vers « ${e.target.value} »`);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 outline-none hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {subjectTabs.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {doc.tags.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    #{t}
                  </span>
                ))}
                <span className="ml-auto text-[10px] text-slate-400">
                  {new Date(doc.updatedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewDocumentModal
        open={newDocOpen}
        onClose={() => setNewDocOpen(false)}
        kind={kind}
        defaultSubjectId={subjectId}
        defaultTab={activeTab}
        onCreated={(id) => navigate(`/${basePath}/${id}`)}
      />
    </div>
  );
}
