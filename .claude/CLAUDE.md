# Crazer — Contexte pour Claude Code

Application mobile Expo (React Native + Expo Router, web inclus) pour organiser des sorties entre amis. Backend : Supabase (Postgres + PostGIS, Auth, RLS). State : Zustand. Tests : Jest + Testing Library.

## Règles du projet (non négociables)

@../AGENTS.md

Conventions de code (architecture feature-first, imports `@/*`, TypeScript strict sans `any`) : @../CONVENTIONS.md

Rappels clés :
- Jamais de `git commit` / `git push` sans validation explicite de l'utilisateur.
- Jamais de travail sur `main` : une branche `feature/…`, `fix/…` ou `chore/…` par tâche.
- Bug → test qui reproduit d'abord, puis correctif.
- Toute modif de schéma → migration dans `supabase/migrations/` + régénération des types.

## Commandes de vérification

```bash
npm test            # Jest (tests unitaires + composants)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (.ts/.tsx)
```

## Supabase : toujours travailler en LOCAL d'abord

Une stack Supabase complète tourne en local via Docker (`supabase start`). C'est l'environnement par défaut pour développer et tester les migrations ; le projet distant (`pqczmkchxhfufaufljxr`) n'est touché que par `npm run db:push` / la CI, **après accord de l'utilisateur**.

Le guide complet (installation, bascule local/distant, Android, comptes de test, dépannage) est dans le skill `supabase-local` (`.claude/skills/supabase-local/SKILL.md`) et dans [docs/SUPABASE.md](../docs/SUPABASE.md).

Résumé :

| Besoin | Commande |
| :--- | :--- |
| Démarrer / arrêter la stack | `npm run db:start` / `npm run db:stop` |
| URLs + clés locales | `npm run db:status` |
| Rejouer migrations + seeds | `npm run db:reset` |
| Pointer l'app vers le local | `npm run env:local` (`-- --android` pour l'émulateur) |
| Revenir au distant | `npm run env:remote` |
| Nouvelle migration | `npm run db:migration <nom>` |
| Types depuis la base locale | `npm run db:types:local` |

URLs locales : API `http://127.0.0.1:54321` · Studio `http://127.0.0.1:54323` · Mailpit `http://127.0.0.1:54324` · Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

Comptes de test (seeds) : `alice@crazer.app`, `bob@crazer.app`, `charlie@crazer.app` — mot de passe `Password`.

## Lancer l'app

- Web contre Supabase local : lancer d'abord `npm run env:local` (écrit `.env.local`, lu par Expo), puis la configuration `expo-web-local` de `.claude/launch.json` (mode CI, sans rechargement, cache vidé : vérifications automatisées) ou `expo-web-local-watch` (rechargement à chaud : développement avec l'utilisateur). Port 8081.
- Sinon : `npm run env:local` puis `npx expo start --clear`.
