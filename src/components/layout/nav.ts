import {
  Home, BookOpen, NotebookText, Dumbbell, BarChart3, Calculator,
  CalendarClock, Settings, CheckSquare, FolderDown,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Accueil", end: true, icon: Home },
  { to: "/cours", label: "Cours", icon: BookOpen },
  { to: "/fiches", label: "Fiches", icon: NotebookText },
  { to: "/exercices", label: "Exercices", icon: Dumbbell },
  { to: "/devoirs", label: "Devoirs / Évals", icon: CheckSquare },
  { to: "/depot", label: "Dépôt", icon: FolderDown },
  { to: "/notes", label: "Notes", icon: BarChart3 },
  { to: "/calculateur", label: "Calculateur", icon: Calculator },
  { to: "/emploi-du-temps", label: "Emploi du temps", icon: CalendarClock },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];
