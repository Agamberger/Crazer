# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des POIs (Points d'Intérêt) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Mode Expo Go (Développement)* : Intègre automatiquement une carte **OpenStreetMap / Leaflet** interactive via `react-native-webview` (tuiles CartoDB Dark Matter / Positron / OpenStreetMap). Cela permet d'avoir une **vraie carte totalement fonctionnelle directement dans Expo Go**, sans aucun crash ni compilation de binaire natif requis !
- **`MapHeaderSearch`** : Barre de recherche dynamique avec autocomplétion Google Places / Supabase et filtres de catégories.
- **`PoiDetailCard`** : Carte d'affichage des détails d'un lieu sélectionné (photos, horaires d'ouverture, note, avis, prix, boutons d'action d'itinéraire et favoris).
- **`StyleSelector`** : Widget de sélection du style de carte (Dark, Light, Outdoor).
- **`useMapStore`** : Store Zustand pour l'état de la carte (POIs, filtres, mode de style, centrage, waypoints).
- **`usePlaces`** : Hook unifié connectant la recherche de lieux Supabase PostGIS et l'API Google Places avec gestion du GPS (`expo-location`).
- **`placeService`** : Service de gestion des requêtes Supabase (`places` table, fonction RPC PostGIS `get_nearby_places`).
- **`googlePlacesService`** : Service client pour Google Places API (autocomplete, place details, photo url).

## 🧪 Tests

Les tests unitaires et de composants se trouvent dans `src/features/carte/__tests__/` :
- `MapViewComponent.test.tsx`
- `PoiDetailCard.test.tsx`
- `MapHeaderSearch.test.tsx`
- `useMapStore.test.ts`
- `usePlaces.test.ts`
- `placeService.test.ts`
- `googlePlacesService.test.ts`
- `infiniteLoopReproduction.test.tsx`
