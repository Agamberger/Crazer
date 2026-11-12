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
9. **`outing_answers`**: guided answers (step 4), one row per member and outing (`UNIQUE (outing_id, user_id)`) with typed columns; which columns are used depends on `outings.outing_type`.
10. **`outing_activities`** / **`outing_activity_votes`**: activity proposals and their votes (step 5, see below).
11. **`planned_outings.activity_id`**: links a step to the retained activity it comes from (step 6, planning of the day, see below).

### Outing type and guided questions (step 4)

- **`outings.outing_type`** (`outing_type` enum: `precise`, `one_day`, `holidays`): nullable, `NULL` until the organizer picks it (the organizer can reset it to `NULL` to choose again). Only the organizer can update `outings`, so no dedicated RPC.
- **`outing_answers`** columns: `precise` → `activity_type` (`outing_activity_type` enum), `place_wish` (free text, ≤ 200), `preferred_time`, `eat_before`; `one_day` → `day_preferences` (text array); `holidays` → `period_start` / `period_end` (end ≥ start), `budget` (`outing_budget` enum), `wishes` (text array). Answers of an unused type are kept when the type changes.
- RLS: members read every answer of the outing; each member inserts / updates / deletes only their own row, and a member who declined the outing can no longer write. `day_preferences` and `wishes` are restricted to the known values by CHECK constraints. `outing_id` and `user_id` are not updatable (hence the app does update-then-insert instead of `upsert`). `outing_answers` is not in the realtime publication (the app loads the group's answers on screen open).
- Seeds: the rooftop outing (`c2222…`) is `precise` and Alice has answered; Bob has not. Tests: `supabase/tests/database/outing_type_questions.test.sql`.

### Activity proposals and votes (step 5)

- **`outing_activities`**: activities proposed for an outing, `day` nullable (`NULL` = any day; otherwise a composite FK to `outing_days (outing_id, day)`), `title` (1–120), `note` (≤ 300), `proposed_by`, `place_id` (optional FK to `places`, `ON DELETE SET NULL`: Crazer places and places imported from Google Maps), `chosen`. Partial unique indexes allow **one chosen activity per day group** (and one for the `NULL` day group).
- **`outing_activity_votes`**: one vote (`activity_vote` enum: `accepted` / `maybe`) per member and activity (`UNIQUE (activity_id, user_id)`; no row = no vote). `outing_id` is denormalized and enforced by the composite FK `(activity_id, outing_id)` → `outing_activities (id, outing_id)` so RLS and realtime filters need no join.
- Helper `is_outing_attendee(outing_id)` (SECURITY DEFINER): organizer, or participant `accepted` / `maybe` (an invited or declined member cannot propose nor vote).
- RLS: members read; attendees insert (`proposed_by` / `user_id` = caller, `chosen` must be false); the author or the organizer updates (**only** `title`, `note`) and deletes activities; members insert / update (`vote` only) / delete their own votes. `chosen` is written only by the RPCs below.
- RPCs (SECURITY DEFINER, `authenticated` only, organizer only): `choose_outing_activity(p_activity_id)` retains an activity and clears the other ones of its day group; `draw_outing_activity(p_outing_id, p_day)` random tie-break among the best scored activities of the group (accepted = 2 points, maybe = 1), retains the winner and returns its id; `reopen_outing_activities(p_outing_id, p_day)` clears the choice. Internal `set_chosen_outing_activity` is not callable by clients.
- Realtime: both tables are in the `supabase_realtime` publication with `REPLICA IDENTITY FULL` (so DELETE events carry `outing_id` and match the filter).
- Seeds: two proposals on the rooftop outing's first day (`f1111…`, `f2222…`), Alice voted « Partant » on the first. Tests: `supabase/tests/database/activity_votes.test.sql`.

### Planning of the day (step 6)

- **`planned_outings`** stays the single model of the day's steps (no parallel table): the order is `scheduled_for`, the length `duration_min`. New column **`activity_id`** (nullable): composite FK `(activity_id, outing_id)` → `outing_activities (id, outing_id)` `ON DELETE SET NULL (activity_id)` (deleting the activity keeps the step, unlinked), partial unique index (an activity is placed once; a `cancelled` step frees it). Clients cannot write `activity_id` (column-level `INSERT` grant without it, no `UPDATE` grant); members still insert manual steps.
- RPCs (SECURITY DEFINER, `authenticated` only):
  - `place_outing_activity(p_activity_id, p_scheduled_for, p_duration_min)` (organizer only, activity must be `chosen` and, when it has a day, placed on that day in some time zone — UTC−12 to UTC+14; duration 1–1440): creates the step (title, note → `notes`, `place_id` copied, status `pending`) and returns its id.
  - `reschedule_outing_steps(p_outing_id, p_steps)` (organizer only): `p_steps` = `[{"id", "scheduled_for", "duration_min"}]`, every id must belong to the outing; saves all times atomically (reorder, durations, suggested schedule).
  - `apply_outing_planning(p_outing_id, p_steps, p_placements)` (organizer only): runs both in **one transaction** (`p_placements` = `[{"activity_id", "scheduled_for", "duration_min"}]`, activities of the outing only). This is the RPC the app calls.
  - Both move `outings.start_date` back to the earliest step when it is later (internal `lower_outing_start_date`), so a planning can start before the common slot (e.g. a late arrival made the common slot start at 20:00).
  - `set_my_outing_availability(p_outing_id, p_day, p_start, p_end)` (attendees only, candidate day, end > start): replaces the caller's slot of the day — this is how a **late arrival** (or an early departure) is recorded.
- Realtime: `planned_outings` is in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`, so every member sees the planning live (the app debounces the refetch, so a re-pack of N steps triggers one reload).
- Seeds: « Samedi entre potes » (`c4444…`, Alice, one day = today + 3, start 14:00 Paris): Bob available 14:00–22:00, **Charlie only from 20:00**; retained activities Karting (`f5555…`, placed as step `e3333…` at 14:00, 90 min) and Restaurant (`f6666…`, « any day », not placed). Tests: `supabase/tests/database/outing_planning.test.sql`.

### Scheduling RPCs (outing creation workflow)

- **`create_outing_with_invites(p_title, p_days, p_slots, p_invitee_ids, p_outing_type DEFAULT NULL)`**: atomically creates an **undated** `draft` outing (`outings.start_date` is nullable since `outing_without_date`; the candidate days live in `outing_days`), stores the `outing_type` chosen in the wizard (atomically), adds the organizer as an `accepted` participant, its candidate days, the organizer's slots and the invitations. Only accepted friends can be invited; any error rolls everything back.
- **Undated outings**: `outings.start_date` is `NULL` until a day is chosen. The trigger `check_planned_outing_scheduled_for` only enforces `scheduled_for >= start_date` when the outing has a date; `planned_outings.scheduled_for` stays required (the app defaults it to the outing date, else the first planned step's date, else the first candidate day). Setting a date on an outing moves earlier steps to that date (trigger `outings_align_planned_outings`).
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
