# ⚡ Guide Supabase & CLI — Crazer

Ce document décrit l'organisation, les bonnes pratiques et le workflow complet pour l'utilisation du **CLI Supabase** et l'administration de la base de données du projet **Crazer**.

---

## 📌 Informations du Projet

- **Project Ref Supabase** : `pqczmkchxhfufaufljxr`
- **Fichier de configuration local** : `supabase/config.toml`
- **Dossier de migrations** : `supabase/migrations/`
- **Types TypeScript générés** : `src/shared/types/database.types.ts`

---

## 🛠️ Commandes CLI Supabase (Scripts npm)

Des raccourcis npm ont été configurés dans `package.json` pour simplifier toutes les actions Supabase CLI :

| Commande | Action Supabase CLI | Description |
| :--- | :--- | :--- |
| `npm run db:types` | `supabase gen types typescript ...` | Régénère automatiquement les types TypeScript à partir de la base de données |
| `npm run db:pull` | `supabase db pull` | Récupère le schéma de la base distante vers un fichier de migration local |
| `npm run db:push` | `supabase db push` | Applique les migrations SQL locales vers la base de données distante |
| `npm run db:migration <nom>` | `supabase migration new` | Crée un nouveau fichier SQL de migration horodaté dans `supabase/migrations/` |
| `npm run db:diff <nom>` | `supabase db diff` | Génère un fichier de migration basé sur les différences observées |
| `npm run db:lint` | `supabase db lint` | Vérifie la syntaxe et la sécurité du schéma SQL local |

---

## 📜 Bonnes Pratiques & Workflow Strict

### 1. 🗃️ Gestion des Modifications de Schéma (Migrations Only)
- **Interdiction de modification directe** : Ne modifiez jamais directement les tables ou colonnes sur le Dashboard Supabase sans archiver la modification dans une migration.
- **Workflow recommandé** :
  1. Créez une migration : `npx supabase migration new <nom_explicite_feature>`
  2. Rédigez les requêtes DDL SQL dans le fichier généré sous `supabase/migrations/<timestamp>_<nom>.sql`.
  3. Appliquez les migrations à la base distante : `npm run db:push`
  4. Régénérez les types TypeScript : `npm run db:types`
  5. Vérifiez la qualité du code : `npm run typecheck` & `npm test`

### 2. 🔐 Sécurité & Row Level Security (RLS)
- **RLS Obligatoire** : Toute nouvelle table créée **DOIT** avoir le Row Level Security activé :
  ```sql
  ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
  ```
- **Politiques (Policies) explicites** : Définissez toujours des politiques strictes basées sur `auth.uid()` pour restreindre la lecture/écriture aux utilisateurs autorisés.
- **Sécurité des clés API** : Seule la clé publique anonyme `EXPO_PUBLIC_SUPABASE_ANON_KEY` doit être exposée dans l'application mobile. Ne jamais stocker ni utiliser la clé `service_role` dans le code source React Native.

### 3. 🏷️ Synchronisation des Types TypeScript
- Le fichier `src/shared/types/database.types.ts` est la source de vérité pour le typage du client Supabase (`supabase.from('outings')`).
- À chaque ajout de table, colonne ou enum dans Supabase, vous **devez** exécuter :
  ```bash
  npm run db:types
  ```

### 4. 🔀 Versionning & Workflow GitOps
- **Git = Source de vérité absolue** : Le schéma de base de données est versionné sous `supabase/migrations/`.
- **Pipeline CI/CD Supabase (`.github/workflows/supabase-db.yml`)** :
  - **Sur Pull Request** : Le CLI Supabase effectue un linting automatique (`supabase db lint`) pour valider la sécurité et la syntaxe des nouvelles migrations.
  - **Sur Merge / Push dans `main`** : GitHub Actions applique automatiquement les migrations sur le projet Supabase de production avec `supabase db push`.
- **Secrets GitHub requis pour le GitOps** :
  - `SUPABASE_ACCESS_TOKEN` : Token d'accès CLI Supabase.
  - `SUPABASE_DB_PASSWORD` : Mot de passe de la base de données Postgres Supabase.

