---
name: supabase-local
description: Installer, démarrer et utiliser la stack Supabase locale (Docker) de Crazer — bascule de l'app Expo entre local et distant, migrations testées en local, seeds et comptes de test, régénération des types, accès Android/appareil physique, dépannage. À utiliser pour toute tâche touchant la base de données, les migrations, les politiques RLS, ou pour lancer l'app contre une base de test.
---

# Supabase local — Crazer

La stack Supabase complète (Postgres 17 + PostGIS, Auth/GoTrue, PostgREST, Realtime, Storage, Studio, Mailpit) tourne en local via Docker grâce au CLI `supabase` (installé en devDependency, appelé via `npx supabase` ou les scripts `npm run db:*`). Configuration : `supabase/config.toml` (`project_id = "Crazer"`).

**Principe** : on développe et on teste toujours contre la base locale. Le projet distant (`pqczmkchxhfufaufljxr`) n'est modifié que par `npm run db:push` ou la CI sur `main`, et uniquement après accord explicite de l'utilisateur.

## 1. Installation (une seule fois)

1. **Docker** installé et démarré (`docker ps` doit répondre). Sous Linux, l'utilisateur doit être dans le groupe `docker`.
2. `npm install` (installe le CLI `supabase`).
3. Premier démarrage (télécharge les images, plusieurs minutes) :
   ```bash
   npm run db:start
   ```
   Les migrations de `supabase/migrations/` puis les seeds `supabase/seeds/*.sql` sont appliqués automatiquement.
4. Pointer l'app vers le local :
   ```bash
   npm run env:local
   ```
   Écrit `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` (ignoré par git, prioritaire sur `.env` qui contient le distant). Les autres variables de `.env.local` sont conservées.
5. Relancer Expo **avec `--clear`** (les `EXPO_PUBLIC_*` sont figées dans le bundle) :
   ```bash
   npx expo start --clear
   ```

## 2. Usage quotidien

| Action | Commande |
| :--- | :--- |
| Démarrer / arrêter | `npm run db:start` / `npm run db:stop` |
| État, URLs et clés | `npm run db:status` (`npx supabase status -o env` pour un format parsable) |
| Repartir d'une base propre (migrations + seeds) | `npm run db:reset` |
| App → local | `npm run env:local` |
| App → distant | `npm run env:remote` |
| Types TS depuis le local | `npm run db:types:local` |

`npm run db:stop` conserve les données (volumes Docker). `npx supabase stop --no-backup` les supprime.

### URLs locales

| Service | URL |
| :--- | :--- |
| API (REST, Auth, Storage) | `http://127.0.0.1:54321` |
| Studio (UI d'admin) | `http://127.0.0.1:54323` |
| Mailpit (emails envoyés par Auth) | `http://127.0.0.1:54324` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Accès SQL direct : `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres` ou l'éditeur SQL du Studio.

### Comptes de test (seeds)

| Email | Mot de passe | Rôle dans les données |
| :--- | :--- | :--- |
| `alice@crazer.app` | `Password` | Organisatrice, amie de Bob |
| `bob@crazer.app` | `Password` | Ami / participant |
| `charlie@crazer.app` | `Password` | Demande d'ami en attente |

La confirmation d'email est désactivée en local (`[auth.email] enable_confirmations = false`) : un compte créé via l'inscription est utilisable immédiatement.

## 3. Lancer l'app selon la cible

`127.0.0.1` désigne l'appareil lui-même : il ne fonctionne que pour le web et le simulateur iOS.

| Cible | Commande |
| :--- | :--- |
| Web / simulateur iOS | `npm run env:local` |
| Émulateur Android | `npm run env:local -- --android` (→ `10.0.2.2`) |
| Appareil physique (Expo Go / dev client) | `npm run env:local -- --host <IP-LAN-du-PC>` (ex: `ip -4 addr` / `hostname -I`) |

Puis `npx expo start --clear`. Pour le web, la configuration `expo-web-local` de `.claude/launch.json` fait tout d'un coup (injecte URL + clé locales, port 8081) sans toucher `.env.local`.

Appareil physique : le pare-feu du PC doit autoriser le port 54321 depuis le LAN.

## 4. Workflow migration (obligatoire, voir AGENTS.md §5)

1. Être sur une branche `feature/…` / `fix/…` / `chore/…`.
2. Créer la migration :
   ```bash
   npm run db:migration <nom_explicite>
   ```
3. Écrire le SQL dans `supabase/migrations/<timestamp>_<nom>.sql`. Toute nouvelle table : `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` + policies basées sur `auth.uid()` + `GRANT` nécessaires.
4. Appliquer en local depuis zéro (détecte aussi les seeds cassés) :
   ```bash
   npm run db:reset
   ```
5. Vérifier : `npm run db:lint`, puis tester les policies RLS en se connectant dans l'app avec les comptes de test (ou en SQL avec `set role authenticated; set request.jwt.claims = '{"sub":"<uuid>"}';`).
6. Régénérer les types et valider :
   ```bash
   npm run db:types:local
   npm run typecheck && npm test
   ```
7. Si les seeds dépendent du nouveau schéma, les mettre à jour dans `supabase/seeds/` (fichiers numérotés, exécutés dans l'ordre alphabétique).
8. **S'arrêter et demander** avant `npm run db:push` (distant) ou tout commit/push.

Alternative : modifier le schéma dans le Studio local puis `npx supabase db diff -f <nom>` pour générer la migration — relire le SQL généré, puis `npm run db:reset` pour vérifier qu'il rejoue proprement.

`npm run db:types` (sans `:local`) lit le schéma **distant** : ne l'utiliser qu'après un `db:push`.

## 5. Dépannage

| Symptôme | Cause / solution |
| :--- | :--- |
| `Cannot connect to the Docker daemon` | Démarrer Docker (`sudo systemctl start docker`). |
| `port is already allocated` (5432x) | Une autre stack Supabase tourne : `npx supabase stop --project-id <autre>` ou `docker ps` pour l'identifier. |
| L'app parle toujours au distant | `.env.local` absent ou Expo pas relancé avec `--clear`. Vérifier `cat .env.local`. |
| `Network request failed` sur Android | URL en `127.0.0.1` : relancer `npm run env:local -- --android`. |
| Erreur de migration au `db:reset` | Corriger le fichier SQL fautif ; ne jamais éditer une migration déjà poussée en distant, en créer une nouvelle. |
| `permission denied for table …` | `GRANT` manquant pour `authenticated` / `anon` dans la migration. |
| `infinite recursion detected in policy` | Policy qui se référence via une autre table : passer par une fonction `SECURITY DEFINER` (cf. `is_outing_participant`). |
| Clé anon invalide après `supabase stop --no-backup` | Relancer `npm run env:local`. |
| `WARN: config section [inbucket] is deprecated` | Avertissement sans conséquence du CLI récent (Mailpit remplace Inbucket). |

## 6. Ce qu'il ne faut pas faire

- Utiliser `SERVICE_ROLE_KEY` / `SECRET_KEY` dans l'app (même en local) : seule la clé anon est exposée côté client.
- Modifier la base distante sans migration versionnée.
- Lancer `db:push`, `db pull`, `supabase link` ou toute commande `--linked` sans accord explicite de l'utilisateur.
- Committer `.env.local`.
