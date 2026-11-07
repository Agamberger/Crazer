# 👤 Feature Profil & Amis — Documentation Technique

Le module `src/features/profil` gère le profil utilisateur, les préférences d'intérêt, ainsi que la **recherche d'utilisateurs, la consultation de profil et la gestion des amitiés** sur l'application Crazer.

---

## 📂 Organisation des Fichiers

```
src/features/profil/
├── components/                  # Composants UI
│   ├── BadgesSection.tsx              # Liste des badges (Card + Badge)
│   ├── InterestsSection.tsx           # Centres d'intérêt (Chip)
│   ├── PendingFriendRequestsBanner.tsx # Carrousel des demandes d'ami reçues
│   ├── ProfileHeaderCard.tsx          # En-tête du profil (Avatar, statistiques)
│   ├── UserListItem.tsx               # Ligne utilisateur (ListItem + Avatar + bouton d'action)
│   ├── UserProfileDetailModal.tsx     # Profil détaillé (AppModal plein écran)
│   └── UserSearchModal.tsx            # Recherche d'amis (AppModal plein écran + SearchBar)
├── hooks/                       # Custom hook
│   └── useFriends.ts                  # Encapsulation des sélecteurs et actions amitié
├── services/                    # Service Supabase
│   └── friendsService.ts              # Requêtes SQL Supabase (searchUsers, sendRequest, accept, remove)
├── store/                       # Stores Zustand
│   ├── useFriendsStore.ts             # État réactif de la recherche et de la liste d'amis
│   └── useProfilStore.ts              # État du profil utilisateur courant
├── types/                       # Définitions TypeScript
│   └── index.ts                       # FriendStatus, UserSearchResult, Friendship...
├── utils/                       # Helpers purs
│   └── userDisplay.ts                 # getUserDisplayName (nom, sinon email, sinon libellé générique)
├── __tests__/                   # Tests automatisés (unitaires & composants)
│   ├── friendsService.test.ts
│   ├── MaskedEmail.test.tsx
│   ├── userDisplay.test.ts
│   ├── useFriendsStore.test.ts
│   └── UserSearchModal.test.tsx
├── README.md                    # Ce document
└── index.ts                     # Exports publics du module
```

---

## ⚡ Fonctionnalités & Architecture

### 1. Service Supabase (`friendsService.ts`)
- **`searchUsers(query, currentUserId)`** : Appelle la RPC `search_profiles` (nom en sous-chaîne, jokers échappés, ou **email exact** ; 2 caractères minimum), puis croise les résultats avec `friendships` pour déduire le statut (`none`, `pending_sent`, `pending_received`, `accepted`). La saisie n'est jamais interpolée dans un filtre PostgREST.
- **`sendFriendRequest(currentUserId, targetUserId)`** : Crée une entrée dans `friendships` avec le statut `'pending'`.
- **`acceptFriendRequest(friendshipId)`** : Bascule le statut d'une amitié à `'accepted'`.
- **`removeFriendship(friendshipId)`** : Supprime une amitié ou annule une demande d'ami.
- **`getFriendsList(currentUserId)`** : Charge les amis confirmés et demandes reçues (profils via la RPC `get_profiles`).

> **Email masqué** : `UserSearchResult.email` vaut `null` sauf pour un ami accepté, l'auteur d'une demande reçue, ou un email saisi exactement. Utiliser `getUserDisplayName(user)` pour l'affichage.

### 2. Consultation de Profil & Gestion d'Amis (`UserProfileDetailModal.tsx`)
Un clic sur n'importe quel utilisateur dans la liste ouvre sa fiche de profil détaillée dans une modal élégante avec les informations de compte, le statut d'amitié dynamique et les actions interactives d'ajout/acceptation/suppression.

### 3. Store Zustand (`useFriendsStore.ts`)
Store réactif permettant d'éviter les requêtes superflues et d'assurer une mise à jour instantanée des boutons d'action dans l'interface utilisateur.

### 4. Modèle de Données & RLS (Supabase)
Table SQL `public.friendships` (`supabase/migrations/20260806213000_create_friendships_table.sql`) avec politiques Row Level Security (RLS) :
- Lecture (`SELECT`) : l'utilisateur authentifié doit être `user_id` ou `friend_id`.
- Insertion (`INSERT`) : l'utilisateur courant doit être l'émetteur (`user_id = auth.uid()`), statut `pending` uniquement, pas de demande à soi-même ni en sens inverse d'une relation existante.
- Modification (`UPDATE`) : **destinataire uniquement** (`friend_id = auth.uid()`), colonnes `status` et `updated_at` seulement.
- Suppression (`DELETE`) : l'un ou l'autre des deux participants.
- Durcissement et tests : `supabase/migrations/20261107155629_harden_rls_security.sql`, `supabase/tests/database/rls_security.test.sql`.

---

## 🧪 Tests Automatisés

Exécuter les tests unitaires et de composants pour la feature profil :
```bash
npm test -- src/features/profil
```

---

## 🧩 Composants UI partagés

Les composants de cette feature sont construits avec le kit `@/shared/components`
(`AppModal` en variante `fullScreen`, `SearchBar`, `ListItem`, `Avatar`, `Badge`, `Chip`,
`SectionHeader`, `EmptyState`, `InlineAlert`). L'ancien `UserSearchInput` a été supprimé au
profit de `SearchBar` (le `testID` `input-user-search` est conservé).
