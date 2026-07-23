# 📜 Conventions de Développement — Crazer

Ce document établit les normes d'architecture, de style de code, d'organisation et de travail collaboratif pour le projet **Crazer** (application React Native + Expo + TypeScript).

---

## 1. 🏷️ Conventions de Nommage

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| **Dossiers de features** | `kebab-case` | `src/features/sorties`, `src/features/journal` |
| **Fichiers de composants** | `PascalCase.tsx` | `SortieCard.tsx`, `Button.tsx` |
| **Fichiers de hooks** | `camelCase.ts` ou `.tsx` | `useSortieDetails.ts`, `useSwipeGesture.ts` |
| **Fichiers de stores / services / utils** | `camelCase.ts` | `useSortiesStore.ts`, `apiClient.ts`, `dateUtils.ts` |
| **Composants React** | `PascalCase` | `export const SortieCard: React.FC<Props> = ...` |
| **Types & Interfaces** | `PascalCase` (pas de préfixe `I`) | `export interface Sortie`, `export type SortieStatus` |
| **Variables & Fonctions** | `camelCase` | `const selectedId`, `function calculateExpenses()` |
| **Constantes globales** | `UPPER_SNAKE_CASE` | `MAX_PARTICIPANTS_DEFAULT = 20` |

---

## 2. 📂 Organisation des Dossiers et Imports

### Structure Feature-First
Chaque fonctionnalité réside dans `src/features/<nom-feature>/` :
```
src/features/sorties/
├── components/          # Composants UI spécifiques à la feature
│   └── SortieCard.tsx
├── hooks/               # Hooks personnalisés métier
├── store/               # Store Zustand de la feature
│   └── useSortiesStore.ts
├── types/               # Types TypeScript métier spécifiques
├── __tests__/           # Tests colocalisés
└── index.ts             # API publique de la feature (exports)
```

### Absolute Imports
Utiliser systématiquement l'alias `@/*` défini dans `tsconfig.json` et `babel.config.js` :
```typescript
// ✅ Correct
import { Button } from '@/shared/components/Button';
import { useSortiesStore } from '@/features/sorties';
import { Sortie } from '@/shared/types';

// ❌ À éviter (sauf imports relatifs très proches dans un même dossier)
import { Button } from '../../../shared/components/Button';
```

### Ordre des Imports
1. Modules externes (`react`, `react-native`, `expo-router`, `zustand`)
2. Composants / hooks réutilisables partagés (`@/shared/...`)
3. Code de features métier (`@/features/...`)
4. Utilities, types et constantes (`@/shared/utils`, `@/shared/types`, `@/shared/constants`)
5. Styles ou assets locaux

---

## 3. 🧩 Règles de Composants

1. **Composants Purs & Découplage** :
   - Séparer la logique métier (hooks / stores) de la présentation UI.
   - Les composants visuels partagés doivent rester "bêtes" (stateless autant que possible).
2. **Taille Maximale** :
   - Un composant ne doit idéalement pas dépasser **150-200 lignes**. Au-delà, le découper en sous-composants ou extraire la logique dans un custom hook.
3. **Typage des Props** :
   - Toujours définir une interface explicitement nommée `[NomComposant]Props`.
   - Ne jamais utiliser `any`.

---

## 4. 🗃️ Gestion d'État Global — Zustand

### Choix Technique & Justification
- **Zustand** a été sélectionné pour sa légèreté (< 2kb), sa simplicité, son absence de boilerplate (contrairement à Redux Toolkit), et son excellente compatibilité avec le pattern feature-first.
- Chaque feature possède son propre store autonome (ex: `useSortiesStore`, `useFinancesStore`).

### Bonnes Pratiques Zustand
- Consommer uniquement les sélecteurs nécessaires pour éviter les re-renders inutiles :
  ```typescript
  // ✅ Correct
  const sorties = useSortiesStore((state) => state.sorties);
  
  // ❌ Inefficace (récupère tout le state)
  const store = useSortiesStore();
  ```

---

## 5. ✍️ Style de Code & Qualité

- **TypeScript Stricte** : `noImplicitAny: true`, `strictNullChecks: true`.
- **Prettier** : Formatage automatique (Single quotes, 2 spaces, trailing commas `all`, printWidth 100).
- **ESLint** : Ne laisser aucun warning ou erreur non résolue (`npm run lint`).
- **Gestion des Erreurs** : Toujours typer les blocs `catch` et fournir des retours utilisateurs explicites (`try/catch` avec fallback UI au lieu de plantages silencieux).

---

## 6. 🧪 Convention de Tests

- **Outils** : Jest + React Native Testing Library (`@testing-library/react-native`).
- **Nommage** : `<NomComposant>.test.tsx` ou `<nomUtil>.test.ts`.
- **Priorités de Test** :
  1. **Stores & Calculs Métier** (Tricount / équilibrage des dépenses, filtres d'activités, algorithmes de vote).
  2. **Composants UI interactifs** (Boutons, cartes de sorties, formulaires de création).
  3. **Flux utilisateur & Navigation** (Screens principaux).

---

## 7. 🔀 Git — Commits & Branches

### Conventional Commits
Format obligatoire : `<type>(<scope>): <description court en français ou anglais>`
- `feat(sorties): ajout de la création de sortie privée`
- `fix(finances): correction du calcul des équilibres Tricount`
- `chore(deps): mise à jour d'Expo SDK`
- `docs(readme): ajout des instructions d'installation`

### Nommage des Branches
- Feature : `feature/<nom-de-la-feature>` (ex: `feature/vote-swipe-activites`)
- Fix : `fix/<description-bug>` (ex: `fix/calcul-tricount`)
- Maintenance / Init : `chore/<titre>` (ex: `chore/init-projet`)

> ⚠️ **RÈGLE CRITIQUE GIT** : Aucun `git commit` ni `git push` ne peut être exécuté par un agent IA sans **validation humaine explicite**.

---

## 8. 📱 Accessibilité & Performance Mobile

- **Accessibilité** : Fournir des `accessibilityLabel` et `accessibilityRole` sur les éléments interactifs sans texte explicite (boutons icônes, cartes cliquables).
- **Listes & Performances** :
  - Toujours préférer `FlatList` ou `FlashList` à une `ScrollView` pour afficher des données dynamiques ou longues.
  - Définir `keyExtractor` avec un identifiant unique immuable.
  - Utiliser `React.memo` ou `useCallback` sur les éléments de liste pour éviter les re-renders intempestifs lors des défilements.
