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
| `npm run db:test` | `supabase test db` | Lance les tests pgTAP de `supabase/tests/` (RLS, privilèges) sur la base locale |
| `npm run db:start` | `supabase start` | Démarre la stack Supabase locale (Docker) |
| `npm run db:stop` | `supabase stop` | Arrête la stack locale (données conservées) |
| `npm run db:status` | `supabase status` | Affiche les URLs et clés de la stack locale |
| `npm run db:reset` | `supabase db reset` | Recrée la base locale : migrations + seeds |
| `npm run db:types:local` | `supabase gen types typescript --local` | Régénère les types TypeScript depuis la base **locale** |
| `npm run env:local` | `node scripts/supabase-local-env.js` | Écrit l'URL + la clé anon locales dans `.env.local` (`-- --android`, `-- --host <ip>`) |
| `npm run env:remote` | `node scripts/supabase-local-env.js --reset` | Retire les clés locales de `.env.local` → retour au projet distant (`.env`) |

---

## 🐳 Supabase en Local

Toute la stack (Postgres + PostGIS, Auth, REST, Storage, Studio, Mailpit) tourne en local via Docker. C'est l'environnement par défaut pour développer et valider les migrations avant tout `db:push`.

### Installation (une fois)
1. Installer et démarrer **Docker**.
2. `npm install` (fournit le CLI `supabase`).
3. `npm run db:start` — le premier lancement télécharge les images ; migrations et seeds sont appliqués.
4. `npm run env:local` — fait pointer l'app vers la base locale via `.env.local` (prioritaire sur `.env`).
5. `npx expo start --clear` — `--clear` est nécessaire car les variables `EXPO_PUBLIC_*` sont figées dans le bundle.

### Accès selon la plateforme
| Cible | Commande |
| :--- | :--- |
| Web / simulateur iOS | `npm run env:local` (`127.0.0.1`) |
| Émulateur Android | `npm run env:local -- --android` (`10.0.2.2`) |
| Appareil physique | `npm run env:local -- --host <IP-LAN-du-PC>` |

Pour revenir au projet distant : `npm run env:remote` puis relancer Expo avec `--clear`.

### URLs locales
- API : `http://127.0.0.1:54321`
- Studio : `http://127.0.0.1:54323`
- Mailpit (emails Auth) : `http://127.0.0.1:54324`
- Postgres : `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### Comptes de test
`alice@crazer.app`, `bob@crazer.app`, `charlie@crazer.app` — mot de passe `Password` (voir [supabase/README.md](../supabase/README.md)).

---

## 📜 Bonnes Pratiques & Workflow Strict

### 1. 🗃️ Gestion des Modifications de Schéma (Migrations Only)
- **Interdiction de modification directe** : Ne modifiez jamais directement les tables ou colonnes sur le Dashboard Supabase sans archiver la modification dans une migration.
- **Workflow recommandé** :
  1. Créez une migration : `npx supabase migration new <nom_explicite_feature>`
  2. Rédigez les requêtes DDL SQL dans le fichier généré sous `supabase/migrations/<timestamp>_<nom>.sql`.
  3. Testez-la en local depuis une base propre : `npm run db:reset`
  4. Régénérez les types TypeScript : `npm run db:types:local`
  5. Vérifiez la qualité du code : `npm run typecheck` & `npm test`
  6. Appliquez les migrations à la base distante (après revue) : `npm run db:push`

### 2. 🔐 Sécurité & Row Level Security (RLS)
- **RLS Obligatoire** : Toute nouvelle table créée **DOIT** avoir le Row Level Security activé :
  ```sql
  ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
  ```
- **Politiques (Policies) explicites** : Définissez toujours des politiques strictes basées sur `auth.uid()` pour restreindre la lecture/écriture aux utilisateurs autorisés.
- **Privilèges explicites (GRANT)** : les stacks Supabase récentes n'accordent plus `SELECT/INSERT/UPDATE/DELETE` par défaut aux rôles `anon` / `authenticated`. Chaque migration qui crée une table ou une fonction RPC doit déclarer ses `GRANT` (et rien pour `anon` si la donnée est privée).
- **Colonnes figées** : une politique `UPDATE` sans `WITH CHECK` ne protège pas les colonnes d'identité (`outing_id`, `user_id`…). Restreindre les colonnes modifiables avec `GRANT UPDATE (col1, col2)` et toujours écrire le `WITH CHECK`.
- **Données personnelles** : `profiles.email` n'est pas lisible directement. Passer par les RPC `search_profiles(p_query)` (nom ou email exact) et `get_profiles(p_ids)`, qui ne renvoient l'email qu'à soi-même, à un ami accepté ou à l'auteur d'une demande reçue.
- **Tests RLS** : chaque correctif ou nouvelle politique est couvert par un test pgTAP dans `supabase/tests/database/` (`npm run db:test`). Exemple : `rls_security.test.sql`.
- **Sécurité des clés API** : Seule la clé publique anonyme `EXPO_PUBLIC_SUPABASE_ANON_KEY` doit être exposée dans l'application mobile. Ne jamais stocker ni utiliser la clé `service_role` dans le code source React Native.

### 2 bis. 📍 Lieux Google — règle de stockage (CGU Google Maps Platform)
- **Stockable sans limite** : le **place ID** Google (`places.source_id` quand `source = 'google'`). Google recommande de le rafraîchir s'il a plus de 12 mois (`places.source_id_refreshed_at`, mis à jour par `ensure_google_place` ; une requête Place Details limitée au champ `id` est gratuite).
- **Cache de 30 jours au plus** : latitude / longitude. Crazer ne les stocke **pas du tout** pour les lieux Google (pas de purge à planifier).
- **Interdit** : nom, adresse, photos, note et nombre d'avis, horaires, téléphone, site, avis, types/catégorie dérivée… Ces données sont récupérées **à la volée** par l'app (API Places New) et gardées en mémoire pendant la session (`src/features/carte/services/googlePlaces/`).
- **Garde-fou en base** : la contrainte `places_google_rows_store_place_id_only` refuse toute ligne Google contenant autre chose que son place ID ; les lieux Crazer / OSM gardent nom, position et catégorie obligatoires (`places_non_google_rows_have_core_fields`).
- **Écriture** : un lieu Google s'enregistre uniquement via la RPC `ensure_google_place(p_google_place_id)` (utilisateur connecté, place ID validé, sans doublon). `upsertPlace` / `placeItemToCreatePlaceDto` refusent un lieu Google.
- **Affichage** : toute donnée Google affichée hors d'une carte Google est créditée « Google Maps » (et l'auteur des photos). Avec les CGU EEA (compte de facturation dans l'EEE), le contenu Google ne doit pas être affiché sur ou à côté d'une carte non Google : la fiche détaillée s'ouvre en plein écran, hors de la carte.
- **Migration** `20261127222229_places_store_google_place_id_only` : a vidé le contenu Google de toutes les lignes `source = 'google'` existantes (voir l'en-tête du fichier pour la liste exacte des colonnes). Les liens des étapes et activités (`place_id`) sont conservés.

### 2 ter. 🤝 Contributions des utilisateurs sur les lieux (phase 2)
- Tables `place_photos` (+ `place_photo_reports`), `place_hours_proposals` (+ `place_hours_votes`), `place_reviews` ; bucket Storage privé `place-photos` (JPEG, 2 Mo). Migration `20261128104312_place_contributions`.
- Lecture : tout utilisateur connecté. Écriture : RPC `SECURITY DEFINER` (`add_place_photo`, `report_place_photo`, `delete_place_photo`, `propose_place_hours`, `vote_place_hours`) ; avis écrits directement par leur auteur (RLS).
- Règles : 10 photos / utilisateur / 24 h, 20 photos visibles / lieu, photo masquée au 3e signalement ; horaires confirmés à 2 « Oui » majoritaires, rejetés à 2 « Non » majoritaires.
- **Jamais de contenu copié depuis Google** dans ces tables. Détails : `src/features/place-contributions/README.md`.

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
  - **Sur Pull Request** : les tests pgTAP (`supabase test db`) sont également exécutés.
  - **Sur Merge / Push dans `main`** : GitHub Actions applique les migrations sur le projet Supabase de production avec `supabase db push` (précédé d'un `--dry-run` qui liste ce qui sera appliqué).
  - **Version de la CLI épinglée** (`SUPABASE_CLI_VERSION` dans le workflow), identique à la devDependency `supabase` de `package.json` : ne jamais revenir à `latest`. Pour monter de version, la tester en local puis mettre à jour les deux. Le déploiement cible explicitement le projet lié (`db push --linked`).
- **Environnement GitHub `production`** : le job de déploiement tourne dans cet environnement (*Settings → Environments → production*), sans jamais deux déploiements en parallèle :
  - secrets `SUPABASE_ACCESS_TOKEN` (token d'accès CLI, *Account → Access Tokens*) et `SUPABASE_DB_PASSWORD` (mot de passe Postgres du projet), au niveau du dépôt ou de l'environnement ;
  - **reviewers obligatoires** recommandés, pour valider chaque déploiement de schéma.
  - Si un secret manque, le job échoue avec un message explicite et **rien n'est déployé**.
- **Vérifier qu'une migration est bien en production** : `npx supabase migration list` (projet lié) ou l'onglet *Database → Migrations* du dashboard. Un merge sur `main` ne garantit pas le déploiement si le job a échoué.

