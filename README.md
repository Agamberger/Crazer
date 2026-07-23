# 🚀 Crazer

**Crazer** est une application mobile conçue pour aider les jeunes (étudiants, actifs) à organiser des sorties entre amis, découvrir des activités, décider ensemble quoi faire, et conserver un journal de leurs souvenirs.

L'objectif produit est de lutter contre l'isolement social en simplifiant la planification (choix d'activités par swipe et vote de groupe, itinéraires, finances partagées type Tricount, "journal d'aventure" avec photos/notes, badges/achievements et rewind annuel).

---

## 🛠️ Stack Technique

- **Framework Mobile** : [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 54)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (Mode strict activé)
- **Base de données & Auth** : [Supabase](https://supabase.com/) (`@supabase/supabase-js` avec persistance `AsyncStorage`)
- **Navigation** : [Expo Router v3+](https://docs.expo.dev/router/introduction/) (Navigation basée sur le système de fichiers, routage fortement typé, deep linking natif)
- **Gestion d'État Global** : [Zustand](https://github.com/pmndrs/zustand) (Découplage léger par feature)
- **Tests** : [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- **Linter & Formatage** : [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)

---

## 📂 Arborescence du Projet (Feature-First)

```
Crazer/
├── app/                        # Écrans et routes (Expo Router)
│   ├── (auth)/                 # Écrans d'authentification (login, register)
│   ├── (tabs)/                 # Navigation principale par onglets
│   │   ├── _layout.tsx         # Barre d'onglets (Sorties, Activités, Finances, Journal, Profil)
│   │   ├── index.tsx           # Écran principal : Mes Sorties
│   │   ├── activites.tsx       # Écran Découverte & Vote d'activités
│   │   ├── finances.tsx        # Écran Gestion des dépenses de groupe (Tricount)
│   │   ├── journal.tsx         # Écran Journal d'aventure
│   │   └── profil.tsx          # Écran Profil & Badges
│   └── _layout.tsx             # Root layout et redirection d'authentification
├── src/                        # Code source principal
│   ├── features/               # Modules fonctionnels (Feature-First)
│   │   ├── auth/               # Authentification & Inscription Supabase
│   │   ├── sorties/            # Gestion des sorties, invitations, RSVPs
│   │   ├── activites/          # Recherche d'activités, filtres, swipe & vote
│   │   ├── itineraire/         # Planification d'itinéraires multi-activités
│   │   ├── finances/           # Gestion financière de groupe (Tricount)
│   │   ├── journal/            # Journal d'aventure (souvenirs, photos, notes)
│   │   ├── gamification/       # Badges, achievements & rewind annuel
│   │   └── profil/             # Profil utilisateur, amis, centres d'intérêt
│   ├── shared/                 # Éléments réutilisables transversaux
│   │   ├── components/         # Composants UI de base (Button, Card...)
│   │   ├── constants/          # Thème (Couleurs, Spacing, Typographie)
│   │   ├── hooks/              # Hooks personnalisés génériques
│   │   ├── lib/                # Client Supabase singleton (supabase.ts)
│   │   ├── utils/              # Utilitaires et helpers (dates, formatage)
│   │   └── types/              # Types et interfaces du domaine métier & Supabase DB
├── supabase/                   # Migrations et configuration Supabase CLI
│   └── migrations/             # Migrations DDL SQL versionnées
├── CONVENTIONS.md              # Guide des conventions et bonnes pratiques
├── AGENTS.md                   # Directives et règles strictes pour les agents IA
├── package.json
├── tsconfig.json               # Config TypeScript avec alias @/*
├── jest.config.js              # Config Jest
├── .eslintrc.js                # Config ESLint
└── .prettierrc                 # Config Prettier
```

---

## ⚡ Prise en main & Commandes Utiles

### 1. Configuration des variables d'environnement
Copiez le fichier `.env.example` en `.env.local` et renseignez les clés Supabase :
```bash
cp .env.example .env.local
```
Exemple de contenu `.env.local` :
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Installation des dépendances
```bash
npm install
```

### 3. Lancer l'application en développement (Expo)
```bash
npm start
```
Vous pouvez ensuite appuyer sur :
- `i` pour lancer sur le simulateur **iOS**
- `a` pour lancer sur l'émulateur **Android**
- `w` pour lancer dans le navigateur **Web**

### 4. Exécuter les tests unitaires et de composants
```bash
npm test
```
Pour exécuter les tests en mode observation (watch) :
```bash
npm run test:watch
```

### 5. Vérification de la qualité du code (Linting & TypeScript)
```bash
npm run lint         # Vérification ESLint
npm run lint:fix     # Correction automatique ESLint
npm run typecheck    # Vérification des types TypeScript sans émission
npm run format       # Formatage Prettier
```

### 6. Commandes Supabase CLI (Base de données)
```bash
npm run db:types     # Génère les types TypeScript database.types.ts
npm run db:push      # Applique les migrations SQL locales à la base distante
npm run db:migration <nom> # Crée une nouvelle migration SQL
```

---

## 📜 Guides et Conventions

Avant de contribuer au projet, merci de consulter :
- ⚡ [docs/SUPABASE.md](docs/SUPABASE.md) : Guide Supabase, commandes CLI, migrations SQL et bonnes pratiques.
- 📖 [CONVENTIONS.md](CONVENTIONS.md) : Normes de nommage, architecture, Zustand, tests, accessibilité et commits.
- 🤖 [AGENTS.md](AGENTS.md) : Directives strictes pour les agents IA (TDD bugfix, aucune modification directe sur main, pas de commit/push sans validation humaine).
