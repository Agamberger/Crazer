# 👤 Feature Profil & Amis — Documentation Technique

Le module `src/features/profil` gère le profil utilisateur, les préférences d'intérêt, ainsi que la **recherche d'utilisateurs, la consultation de profil et la gestion des amitiés** sur l'application Crazer.

---

## 📂 Organisation des Fichiers

```
src/features/profil/
├── components/                  # Composants UI
│   ├── UserListItem.tsx               # Élément utilisateur cliquable avec bouton d'action
│   ├── UserProfileDetailModal.tsx     # Modal d'affichage détaillé du profil recherché
│   ├── UserSearchInput.tsx            # Saisie de recherche réactive
│   └── UserSearchModal.tsx            # Modal de recherche d'utilisateurs & requêtes
├── hooks/                       # Custom hook
│   └── useFriends.ts                  # Encapsulation des sélecteurs et actions amitié
├── services/                    # Service Supabase
│   └── friendsService.ts              # Requêtes SQL Supabase (searchUsers, sendRequest, accept, remove)
├── store/                       # Stores Zustand
│   ├── useFriendsStore.ts             # État réactif de la recherche et de la liste d'amis
│   └── useProfilStore.ts              # État du profil utilisateur courant
├── types/                       # Définitions TypeScript
│   └── index.ts                       # FriendStatus, UserSearchResult, Friendship...
├── __tests__/                   # Tests automatisés (unitaires & composants)
│   ├── friendsService.test.ts
│   ├── useFriendsStore.test.ts
│   └── UserSearchModal.test.tsx
├── README.md                    # Ce document
└── index.ts                     # Exports publics du module
```

---

## ⚡ Fonctionnalités & Architecture

### 1. Service Supabase (`friendsService.ts`)
- **`searchUsers(query, currentUserId)`** : Recherche insensible à la casse dans `profiles` par nom (`full_name`) ou email, puis croise les résultats avec `friendships` pour déduire le statut (`none`, `pending_sent`, `pending_received`, `accepted`).
- **`sendFriendRequest(currentUserId, targetUserId)`** : Crée une entrée dans `friendships` avec le statut `'pending'`.
- **`acceptFriendRequest(friendshipId)`** : Bascule le statut d'une amitié à `'accepted'`.
- **`removeFriendship(friendshipId)`** : Supprime une amitié ou annule une demande d'ami.
- **`getFriendsList(currentUserId)`** : Charge les amis confirmés et demandes reçues.

### 2. Consultation de Profil & Gestion d'Amis (`UserProfileDetailModal.tsx`)
Un clic sur n'importe quel utilisateur dans la liste ouvre sa fiche de profil détaillée dans une modal élégante avec les informations de compte, le statut d'amitié dynamique et les actions interactives d'ajout/acceptation/suppression.

### 3. Store Zustand (`useFriendsStore.ts`)
Store réactif permettant d'éviter les requêtes superflues et d'assurer une mise à jour instantanée des boutons d'action dans l'interface utilisateur.

### 4. Modèle de Données & RLS (Supabase)
Table SQL `public.friendships` (`supabase/migrations/20260806213000_create_friendships_table.sql`) avec politiques Row Level Security (RLS) :
- Lecture (`SELECT`) : l'utilisateur authentifié doit être `user_id` ou `friend_id`.
- Insertion (`INSERT`) : l'utilisateur courant doit être l'émetteur (`user_id = auth.uid()`).
- Modification (`UPDATE`) & Suppression (`DELETE`) : restreint aux participants.

---

## 🧪 Tests Automatisés

Exécuter les tests unitaires et de composants pour la feature profil :
```bash
npm test -- src/features/profil
```
