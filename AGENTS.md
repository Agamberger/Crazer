# 🤖 Directives pour Agents IA — Crazer

Ce fichier contient l'ensemble des règles de comportement strictes et non négociables que tout agent IA (assistant de développement) travaillant sur le dépôt **Crazer** doit suivre scrupuleusement.

---

## 1. ⚙️ Génération de Code

- **Code Complet et Opérationnel** : Pour chaque nouvelle feature ou modification, l'agent IA doit générer du code **100% fonctionnel et prêt pour la production**.
  - ❌ **INTERDIT** : Insérer des placeholders, des faux retours `return null;`, des `// TODO: implémenter plus tard` ou du code tronqué à la place de la vraie logique métier.
  - ✅ **OBLIGATOIRE** : Fournir l'ensemble des composants UI, custom hooks, types TypeScript, stores Zustand et leur intégration dans la navigation Expo Router.
- **Documentation Systématique** : À chaque ajout ou modification de feature, l'agent doit mettre à jour le `README.md` et/ou la documentation technique du dossier concerné dans `src/features/`.
- **Obligation de Tests** : **Aucune fonctionnalité n'est considérée comme terminée tant qu'elle ne possède pas ses tests associés (unitaires et/ou composants).** À chaque création ou modification de feature, créer ou mettre à jour les fichiers `.test.tsx` / `.test.ts`.

---

## 2. 🐛 Gestion des Bugs & TDD (Test-Driven Development)

Lorsqu'un bug est signalé ou détecté dans le projet :
1. **Étape 1 — Reproduction par le test (OBLIGATOIRE)** : Avant d'apporter la moindre modification au code source, l'agent IA doit **écrire un test automatisé qui reproduit fidèlement le bug** (démontrant l'échec entre le comportement défaillant observé et le comportement attendu).
2. **Étape 2 — Correction du code** : L'agent applique la correction minimale et propre nécessaire pour résoudre la cause racine du problème.
3. **Étape 3 — Validation** : La correction est considérée comme **validée uniquement lorsque le test écrit à l'étape 1 passe au vert** et que tous les autres tests de la suite restent au vert.

---

## 3. 🚨 Git — Règles Strictes et Non Négociables

> 🛑 **RÈGLE CRITIQUE #1 : AUCUN COMMIT NI PUSH SANS VALIDATION HUMAINE EXPLICITE**
> - **Sous aucun prétexte** (même en cas d'urgence, de petite modification typo, de correctif mineur ou de demande implicite), l'agent IA ne doit exécuter de `git commit` ou de `git push`.
> - L'agent doit préparer l'ensemble des fichiers, vérifier la qualité de son code (build TypeScript, linter, tests), puis **s'arrêter et demander la confirmation explicite de l'utilisateur** en détaillant les modifications apportées.

> 🛑 **RÈGLE CRITIQUE #2 : TRAVAIL EN BRANCHES DÉDIÉES**
> - L'agent IA **ne travaille JAMAIS directement sur les branches de production (`main` ou `master`)**.
> - Pour **chaque nouvelle feature** ou **chaque correction de bug**, une **nouvelle branche dédiée** doit être créée au préalable selon la convention :
>   - Feature : `feature/<nom-de-la-feature>` (ex: `feature/partage-invite-sortie`)
>   - Correctif : `fix/<nom-du-bug>` (ex: `fix/arrondi-depenses-tricount`)
>   - Tâche technique / Init : `chore/<nom-tache>` (ex: `chore/init-projet`)

---

## 4. 🛡️ Qualité, Lisibilité et Alignement

- **Respect de `CONVENTIONS.md`** : L'agent doit vérifier que tout le code produit respecte rigoureusement la convention de nommage, l'architecture feature-first, l'usage des absolute imports (`@/*`), et le typage TypeScript strict sans `any`.
- **Non-Régression** : L'agent doit s'assurer que ses modifications ne cassent aucun test existant dans le projet (`npm test`). Si un test doit être mis à jour suite à un changement d'exigence volontaire, cela doit être explicitement signalé à l'utilisateur.

---

## 5. ⚡ Supabase & CLI — Gestion de la Base de Données

- **Workflow des Migrations CLI** :
  - **Toute modification de schéma** (création/modification de table, colonne, fonction, politique RLS) doit obligatoirement faire l'objet d'une migration via le CLI Supabase (`npx supabase migration new <nom>` ou `npm run db:migration`).
  - ❌ **INTERDIT** : Modifier la base de données distante à la volée sans créer le fichier de migration SQL correspondant dans `supabase/migrations/`.
- **Régénération des Types TypeScript** :
  - Après toute modification de schéma ou de migration, l'agent doit régénérer les types TypeScript via `npm run db:types` et valider l'absence d'erreurs de typage avec `npm run typecheck`.
- **Row Level Security (RLS)** :
  - RLS doit obligatoirement être activé sur chaque nouvelle table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) avec les politiques de sécurité appropriées.
- **Référence Technique** : Se référer systématiquement au guide [docs/SUPABASE.md](docs/SUPABASE.md).

