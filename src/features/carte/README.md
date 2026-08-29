# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des lieux (Places) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Mode Expo Go (Développement)* : Intègre automatiquement une carte **OpenStreetMap / Leaflet** interactive via `react-native-webview` (tuiles CartoDB Dark Matter / Positron / OpenStreetMap). Cela permet d'avoir une **vraie carte totalement fonctionnelle directement dans Expo Go**, sans aucun crash ni compilation de binaire natif requis !
- **`MapHeaderSearch`** : Barre de recherche et filtres de catégories avec autocomplétion Google Places.
- **`PlaceDetailCard`** : Fiche d'affichage des détails d'un lieu sélectionné (note, avis, prix, horaires, photos, boutons d'action).
- **`AddPlaceToOutingModal`** : Modal pour ajouter un lieu à une sortie active avec préremplissage automatique des informations.
- **`StyleSelector`** : Widget de sélection du style de carte (Dark, Light, Outdoor).
- **`useMapStore`** : Store Zustand pour l'état de la carte (Places, filtres, mode de style, centrage).

## 🧪 Tests

Les tests unitaires et de composants se trouvent dans `src/features/carte/__tests__/` :
- `MapViewComponent.test.tsx`
- `PlaceDetailCard.test.tsx`
- `AddPlaceToOutingModal.test.tsx`
- `MapHeaderSearch.test.tsx`
- `placeService.test.ts`
- `googlePlacesService.test.ts`
- `usePlaces.test.ts`
- `useMapStore.test.ts`
