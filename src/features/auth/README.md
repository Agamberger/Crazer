# 🔐 Feature Auth — Documentation Technique

Le module `src/features/auth` fournit l'ensemble des fonctionnalités et composants nécessaires à l'authentification et l'inscription des utilisateurs via **Supabase Auth**.

---

## 📂 Organisation des Fichiers

```
src/features/auth/
├── components/          # Composants UI de formulaires
│   ├── SignInForm.tsx
│   └── SignUpForm.tsx
├── hooks/               # Custom hook d'authentification
│   └── useAuth.ts
├── services/            # Client service Supabase Auth
│   └── authService.ts
├── store/               # Store Zustand de session utilisateur
│   └── useAuthStore.ts
├── types/               # Typage TypeScript (AuthUser, AuthState...)
│   └── index.ts
├── __tests__/           # Tests unitaires et de composants
│   ├── authService.test.ts
│   ├── useAuthStore.test.ts
│   ├── SignInForm.test.tsx
│   └── SignUpForm.test.tsx
├── README.md            # Ce fichier de documentation
└── index.ts             # Exports publics du module
```

---

## ⚡ Architecture & Composants

### 1. Service (`authService.ts`)
Interagit directement avec l'instance `@supabase/supabase-js` :
- `signInWithEmail({ email, password })` : Connexion par identifiants.
- `signUpWithEmail({ email, password, fullName })` : Inscription d'un utilisateur.
- `signOut()` : Déconnexion de la session.
- `getCurrentSession()` : Récupération initiale de la session au démarrage.
- `onAuthStateChange(callback)` : Abonnement temps réel aux changements de session Supabase.

### 2. Store Zustand (`useAuthStore.ts`)
Gère l'état global réactif de l'utilisateur et de la session :
- `user: AuthUser | null`
- `session: Session | null`
- `isLoading: boolean`
- `isInitialized: boolean`
- `error: string | null`

### 3. Hook Custom (`useAuth.ts`)
Expose de manière propre les sélecteurs Zustand et les actions aux composants React Native :
```typescript
const { user, isAuthenticated, login, register, logout, isLoading, error } = useAuth();
```

### 4. Formulaires UI (`SignInForm` & `SignUpForm`)
- Validation côté client (format d'email, longueur minimale du mot de passe, confirmation).
- Gestion des états de chargement et des messages d'erreur.
- Respect strict du thème graphique de Crazer et des règles d'accessibilité (`accessibilityLabel`, `testID`).

---

## 🗃️ Modèle de Base de Données & Déclencheur (Trigger)

Lors de l'inscription via `signUpWithEmail`, Supabase alimente la table `auth.users`. Une migration SQL CLI (`20260723191340_create_profiles_table.sql`) crée la table `public.profiles` et écoute l'événement `AFTER INSERT ON auth.users` pour initialiser automatiquement la fiche utilisateur correspondante.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 🧪 Tests Automatisés

Pour exécuter les tests spécifiques à la feature Auth :
```bash
npm test -- src/features/auth
```
