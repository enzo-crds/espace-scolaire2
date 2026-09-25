# 🎓 Espace Scolaire — Dashboard scolaire personnel

Application web personnelle, moderne et 100% côté client pour centraliser vos **cours**, **fiches de
révision**, **notes**, votre **emploi du temps** et un **calculateur de moyennes**.

Aucun serveur, aucune base de données, aucun compte requis : toutes les données sont stockées
**localement dans votre navigateur** (IndexedDB via [localforage](https://localforage.github.io/localForage/),
avec un petit cache localStorage pour les préférences d'affichage). Le site est pensé pour être hébergé
gratuitement sur **GitHub Pages**.

## ✨ Fonctionnalités

- **Accueil** : moyenne générale, statistiques, prochains cours, dernières notes, moyennes par matière, raccourcis.
- **Cours** & **Fiches de révision** : organisation par matière, éditeur de texte riche intégré (titres, gras,
  italique, souligné, barré, couleurs, surlignage, listes, alignement, citations, liens, tableaux, images,
  annuler/rétablir, recherche dans le document, compteur de mots), import de fichiers (PDF, DOCX, images, TXT),
  conversion best-effort d'un DOCX vers l'éditeur via [mammoth.js](https://github.com/mwilliamson/mammoth.js).
- **Notes** : matières personnalisables (couleur, icône, coefficient), notes avec barème libre (converties
  automatiquement sur /20), coefficients, moyenne pondérée par matière, moyenne générale (moyenne des
  moyennes ou pondérée par coefficient de matière).
- **Calculateur de moyenne** : note nécessaire au prochain contrôle, simulation de plusieurs futures notes,
  recherche de combinaisons réalistes de notes pour atteindre un objectif.
- **Emploi du temps** : semaines A/B, horaires 100% personnalisés, glisser-déposer sur la vue bureau,
  vue liste adaptée au mobile.
- **Paramètres** : thème clair / sombre / système, couleur d'accent, export/import JSON complet, suppression
  des données avec confirmation, estimation de l'espace de stockage utilisé.
- **Recherche globale** (`Ctrl/Cmd + K`) dans les cours, fiches, tags et notes.
- Toasts de confirmation, boîtes de dialogue de confirmation avant suppression, états vides guidés.

## ⚠️ Limites connues (stockage navigateur)

- Les données ne sont disponibles **que sur l'appareil et le navigateur** où elles ont été créées. Pensez à
  exporter régulièrement une sauvegarde JSON depuis **Paramètres → Données**.
- Videz le cache du navigateur avec précaution : cela peut supprimer les données stockées en IndexedDB.
- Les fichiers volumineux ou très nombreux peuvent approcher les quotas de stockage du navigateur (variable
  selon les navigateurs, en général plusieurs centaines de Mo à quelques Go).
- Les fichiers **.docx** ne peuvent pas être édités directement dans le navigateur (aucune bibliothèque
  fiable ne permet une édition native de ce format côté client). Vous pouvez néanmoins les ouvrir/télécharger,
  ou importer une conversion best-effort de leur contenu dans l'éditeur riche du site.

## 🧱 Stack technique

- [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [react-router-dom](https://reactrouter.com/) (`HashRouter`, compatible GitHub Pages sans configuration serveur)
- [Tiptap](https://tiptap.dev/) pour l'éditeur de texte riche
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) pour la conversion DOCX → HTML
- [localforage](https://localforage.github.io/localForage/) pour la persistance (IndexedDB)
- [lucide-react](https://lucide.dev/) pour les icônes
- `vite-plugin-singlefile` : le build produit un **unique fichier `dist/index.html`** autonome (HTML + CSS + JS
  inlinés), ce qui simplifie encore la publication sur GitHub Pages.

## 🚀 Démarrage local

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev

# 3. Construire la version de production
npm run build

# 4. Prévisualiser le build de production
npm run preview
```

## 📦 Publier sur GitHub Pages

### Option A — via GitHub Actions (recommandé, automatique)

1. Créez un nouveau repository GitHub (ex. `espace-scolaire`) et poussez-y ce projet :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<votre-utilisateur>/<votre-repo>.git
   git push -u origin main
   ```
2. Dans votre repository GitHub, allez dans **Settings → Pages**.
3. Dans la section **Build and deployment**, choisissez la source **GitHub Actions**.
4. Le workflow fourni (`.github/workflows/deploy.yml`) se déclenche automatiquement à chaque `push` sur
   `main` : il installe les dépendances, build le projet puis publie le contenu de `dist/` sur GitHub Pages.
5. Après quelques instants, votre site est disponible à l'adresse :
   `https://<votre-utilisateur>.github.io/<votre-repo>/`

### Option B — déploiement manuel

```bash
npm run build
# Le résultat se trouve entièrement dans dist/index.html (fichier autonome)
```

Vous pouvez alors publier le contenu du dossier `dist/` sur la branche `gh-pages` avec l'outil de votre
choix (ex. [`gh-pages`](https://www.npmjs.com/package/gh-pages)), ou glisser-déposer `dist/index.html`
sur n'importe quel hébergeur statique.

### Mettre le site à jour

Il suffit de modifier le code, puis de refaire un `git push` sur `main` : le workflow GitHub Actions
reconstruit et republie automatiquement le site à chaque mise à jour.

## 🗂️ Architecture du projet

```
src/
├── components/
│   ├── layout/       # Sidebar, navigation mobile, barre du haut, recherche globale
│   ├── common/        # Modal, EmptyState, champs de formulaire réutilisables
│   ├── editor/        # Éditeur de texte riche (Tiptap)
│   ├── files/          # Import (drag & drop) et aperçu de fichiers
│   ├── subjects/      # Modale de gestion des matières
│   └── charts/         # Petits graphiques SVG (moyenne, barres par matière)
├── context/            # ThemeContext, UIContext (toasts/confirmations), DataContext (état global)
├── pages/
│   ├── Dashboard.tsx
│   ├── documents/     # Pages génériques Cours & Fiches (même composant, kind="course"|"fiche")
│   ├── notes/           # Gestion des notes et des moyennes
│   ├── calculator/     # Calculateur d'objectif de moyenne
│   ├── schedule/        # Emploi du temps
│   └── settings/         # Paramètres
├── services/            # storage.ts (IndexedDB), calculations.ts, docx.ts, export.ts, id.ts
├── types/                # Types TypeScript partagés
└── utils/                # Fonctions utilitaires (dates, classNames…)
```

## 🔒 Confidentialité

Aucune donnée ne quitte votre navigateur : il n'y a ni backend, ni tracking, ni compte utilisateur.
