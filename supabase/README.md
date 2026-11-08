# ⚡ Supabase & Base de Données — Crazer

Ce dossier contient la configuration Supabase locale, le schéma de base de données PostgreSQL (avec l'extension géospatiale PostGIS), les politiques de sécurité (RLS), ainsi que les jeux de données de test (*seeds*).

---

## 🚀 Prise en main rapide

### 1. Démarrer les services Supabase en local
Prérequis : Docker démarré.
```bash
npm run db:start        # = npx supabase start
npm run env:local       # app Expo → base locale (.env.local) ; -- --android pour l'émulateur
```
*Le Studio Supabase sera accessible à l'adresse : [http://127.0.0.1:54323](http://127.0.0.1:54323)*

### 2. Réinitialiser la DB locale & appliquer les Seeds
Pour repartir d'une base propre (exécute l'ensemble des migrations et peuple les données depuis `supabase/seeds/*.sql`) :
```bash
npm run db:reset        # = npx supabase db reset
```

### 3. Régénérer les types TypeScript
Après toute modification de schéma ou création de migration, régénérez les types TypeScript pour l'application :
```bash
npm run db:types:local  # = npx supabase gen types typescript --local > src/shared/types/database.types.ts
```

Guide complet (Android, appareil physique, retour au distant, dépannage) : [docs/SUPABASE.md](../docs/SUPABASE.md#-supabase-en-local).

---

## 👥 Jeux de Données Modulaires (*Seeds*)

Les données de test sont découpées de manière modulaire dans le dossier `supabase/seeds/` et configurées dans `config.toml` via `sql_paths = ["./seeds/*.sql"]` :

- `01_users.sql` : Création des comptes de test (`auth.users`, `auth.identities` et `profiles`).
- `02_friendships.sql` : Relations d'amitié entre utilisateurs.
- `03_places.sql` : Lieux et POIs de test (coordonnées PostGIS).
- `04_outings.sql` : Sorties, participants et étapes planifiées. Also seeds the scheduling workflow: candidate days and Alice's availability for the rooftop outing (`c2222…`), with a pending invitation for Bob.

### Comptes de Test par Défaut

| Email | Mot de passe | Nom complet | Rôle |
| :--- | :--- | :--- | :--- |
| `alice@crazer.app` | `Password` | Alice Dupont | Organisateur principal |
| `bob@crazer.app` | `Password` | Bob Martin | Ami / Participant |
| `charlie@crazer.app` | `Password` | Charlie Moreau | Demande d'ami en attente |

---

## 🗄️ Structure du Schéma

### Tables principales

1. **`profiles`** : Profils utilisateurs (synchronisés automatiquement via trigger avec `auth.users`).
2. **`friendships`** : Relations d'amitié entre profils (`pending`, `accepted`, `rejected`).
3. **`places`** : Lieux et POIs (restaurants, bars, activités, nature) stockés avec coordonnées PostGIS `GEOGRAPHY(POINT, 4326)`.
4. **`outings`** : Sorties organisées entre amis (`draft`, `planned`, `ongoing`, `done`, `cancelled`).
5. **`outing_participants`** : Participants invités/inscrits aux sorties (`invited`, `accepted`, `declined`, `maybe`).
6. **`planned_outings`** : Étapes planifiées au sein d'une sortie, liées à des lieux et triées par heure.
7. **`outing_days`**: candidate days of an outing, chosen by the organizer (unique per outing).
8. **`outing_availabilities`**: one time slot (`start_time` < `end_time`) per member and per candidate day; a composite FK guarantees the day is one of the outing's `outing_days`.

### Scheduling RPCs (outing creation workflow)

- **`create_outing_with_invites(p_title, p_start_date, p_days, p_slots, p_invitee_ids)`**: atomically creates a `draft` outing, adds the organizer as an `accepted` participant, its candidate days, the organizer's slots and the invitations. Only accepted friends can be invited; any error rolls everything back.
- **`respond_to_outing_invitation(p_outing_id, p_status, p_slots)`**: an invitee accepts (`accepted` / `maybe`) with their slots, or declines (slots are deleted).
- `p_slots` format: `[{"day": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM"}]`.
- Realtime: `outing_participants` and `outing_availabilities` are in the `supabase_realtime` publication (RLS applies to `postgres_changes`).

---

## 🔒 Row Level Security (RLS)

- **RLS activé** sur toutes les tables de l'application.
- Les fonctions auxiliaires `is_outing_organizer` et `is_outing_participant` en `SECURITY DEFINER` préviennent toute récursion infinie de sécurité entre `outings` et `outing_participants`.
- Outing members (organizer and every participant, whatever their status) can read the outing's participants, days and availabilities; each member only writes their own availabilities. Tests: `supabase/tests/database/outing_scheduling.test.sql`.

---

## 🛠️ Workflow de Migration CLI (Non négociable)

Toute modification de schéma doit obligatoirement passer par une migration CLI Supabase :

1. **Créer une nouvelle migration** :
   ```bash
   npx supabase migration new <nom_explicite>
   ```
2. **Écrire le SQL** dans le fichier généré dans `supabase/migrations/`.
3. **Tester localement** :
   ```bash
   npx supabase db reset
   ```
4. **Mettre à jour les types TypeScript** :
   ```bash
   npx supabase gen types typescript --local > src/shared/types/database.types.ts
   npm run typecheck
   ```
