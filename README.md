# 🚀 Crazer

**Crazer** est une application mobile conçue pour aider les jeunes (étudiants, actifs) à organiser des sorties entre amis, découvrir des activités, décider ensemble quoi faire, et conserver un journal de leurs souvenirs.

L'objectif produit est de lutter contre l'isolement social en simplifiant la planification (choix d'activités par swipe et vote de groupe, itinéraires, finances partagées type Tricount, "journal d'aventure" avec photos/notes, badges/achievements et rewind annuel).

---

## 🛠️ Stack Technique

- **Framework Mobile** : [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 51+)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (Mode strict activé)
- **Navigation** : [Expo Router v3+](https://docs.expo.dev/router/introduction/) (Navigation basée sur le système de fichiers, routage fortement typé, deep linking natif)
- **Gestion d'État Global** : [Zustand](https://github.com/pmndrs/zustand) (Découplage léger par feature)
- **Tests** : [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- **Linter & Formatage** : [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)

---

## 📂 Arborescence du Projet (Feature-First)

```
Crazer/
├── app/                        # Écrans et routes (Expo Router)
│   ├── (tabs)/                 # Navigation principale par onglets
│   │   ├── _layout.tsx         # Barre d'onglets (Sorties, Activités, Finances, Journal, Profil)
│   │   ├── index.tsx           # Écran principal : Mes Sorties
│   │   ├── activites.tsx       # Écran Découverte & Vote d'activités
│   │   ├── finances.tsx        # Écran Gestion des dépenses de groupe (Tricount)
│   │   ├── journal.tsx         # Écran Journal d'aventure
│   │   └── profil.tsx          # Écran Profil & Badges
│   └── _layout.tsx             # Root layout et stack de navigation
├── src/                        # Code source principal
│   ├── features/               # Modules fonctionnels (Feature-First)
│   │   ├── sorties/            # Gestion des sorties, invitations, RSVPs
│   │   ├── activites/          # Recherche d'activités, filtres, swipe & vote
│   │   ├── itineraire/         # Planification d'itinéraires multi-activités
│   │   ├── finances/           # Gestion financière de groupe (Tricount)
│   │   ├── journal/            # Journal d'aventure (souvenirs, photos, notes)
│   │   ├── gamification/       # Badges, achievements & rewind annuel
│   │   └── profil/             # Profil utilisateur, amis, centres d'intérêt
│   ├── shared/                 # Éléments réutilisables transversaux
│   │   ├── components/         # Composants UI de base (Button, Card, Input...)
│   │   ├── constants/          # Thème (Couleurs, Spacing, Typographie)
│   │   ├── hooks/              # Hooks personnalisés génériques
│   │   ├── utils/              # Utilitaires et helpers (dates, formatage)
│   │   └── types/              # Types et interfaces du domaine métier
│   ├── navigation/             # Configuration et types de navigation
│   └── services/               # Services d'API, stockage local, localisation
├── __tests__/                  # Tests globaux et de composants
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

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancer l'application en développement (Expo)
```bash
npm start
```
Vous pouvez ensuite appuyer sur :
- `i` pour lancer sur l'simulateur **iOS**
- `a` pour lancer sur l'émulateur **Android**
- `w` pour lancer dans le navigateur **Web**

### 3. Exécuter les tests unitaires et de composants
```bash
npm test
```
Pour exécuter les tests en mode observation (watch) :
```bash
npm run test:watch
```

### 4. Vérification de la qualité du code (Linting & TypeScript)
```bash
npm run lint         # Vérification ESLint
npm run lint:fix     # Correction automatique ESLint
npm run typecheck    # Vérification des types TypeScript sans émission
npm run format       # Formatage Prettier
```

---

## 📜 Guides et Conventions

Avant de contribuer au projet, merci de consulter :
- 📖 [CONVENTIONS.md](CONVENTIONS.md) : Normes de nommage, architecture, Zustand, tests, accessibilité et commits.
- 🤖 [AGENTS.md](AGENTS.md) : Directives strictes pour les agents IA (TDD bugfix, aucune modification directe sur main, pas de commit/push sans validation humaine).
