# ⚡ Supabase & Base de Données — Crazer

Ce dossier contient la configuration Supabase locale, le schéma de base de données PostgreSQL (avec l'extension géospatiale PostGIS), les politiques de sécurité (RLS), ainsi que les jeux de données de test (*seeds*).

---

## 🚀 Prise en main rapide

### 1. Démarrer les services Supabase en local
```bash
npx supabase start
```
*Le Studio Supabase sera accessible à l'adresse : [http://127.0.0.1:54323](http://127.0.0.1:54323)*

### 2. Réinitialiser la DB locale & appliquer les Seeds
Pour repartir d'une base propre (exécute l'ensemble des migrations et peuple les données depuis `supabase/seeds/*.sql`) :
```bash
npx supabase db reset
```

### 3. Régénérer les types TypeScript
Après toute modification de schéma ou création de migration, régénérez les types TypeScript pour l'application :
```bash
npx supabase gen types typescript --local > src/shared/types/database.types.ts
```

---

## 👥 Jeux de Données Modulaires (*Seeds*)

Les données de test sont découpées de manière modulaire dans le dossier `supabase/seeds/` et configurées dans `config.toml` via `sql_paths = ["./seeds/*.sql"]` :

- `01_users.sql` : Création des comptes de test (`auth.users`, `auth.identities` et `profiles`).
- `02_friendships.sql` : Relations d'amitié entre utilisateurs.
- `03_places.sql` : Lieux et POIs de test (coordonnées PostGIS).
- `04_outings.sql` : Sorties, participants et étapes planifiées.

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

---

## 🔒 Row Level Security (RLS)

- **RLS activé** sur toutes les tables de l'application.
- Les fonctions auxiliaires `is_outing_organizer` et `is_outing_participant` en `SECURITY DEFINER` préviennent toute récursion infinie de sécurité entre `outings` et `outing_participants`.

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
