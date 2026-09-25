import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { UIProvider } from "@/context/UIContext";
import { DataProvider, useData } from "@/context/DataContext";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { DocumentsPage } from "@/pages/documents/DocumentsPage";
import { DocumentEditorPage } from "@/pages/documents/DocumentEditorPage";
import { NotesPage } from "@/pages/notes/NotesPage";
import { CalculatorPage } from "@/pages/calculator/CalculatorPage";
import { SchedulePage } from "@/pages/schedule/SchedulePage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { TasksPage } from "@/pages/tasks/TasksPage";
import { DropzonePage } from "@/pages/depot/DropzonePage";

function AppRoutes() {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-slate-400">Chargement de votre espace scolaire…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cours" element={<DocumentsPage kind="course" />} />
        <Route path="/cours/:id" element={<DocumentEditorPage kind="course" />} />
        <Route path="/fiches" element={<DocumentsPage kind="fiche" />} />
        <Route path="/fiches/:id" element={<DocumentEditorPage kind="fiche" />} />
        <Route path="/exercices" element={<DocumentsPage kind="exercise" />} />
        <Route path="/exercices/:id" element={<DocumentEditorPage kind="exercise" />} />
        <Route path="/devoirs" element={<TasksPage />} />
        <Route path="/depot" element={<DropzonePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/calculateur" element={<CalculatorPage />} />
        <Route path="/emploi-du-temps" element={<SchedulePage />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UIProvider>
        <DataProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </DataProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
