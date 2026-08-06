# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des POIs (Points d'Intérêt) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Comportement dynamique* : Tente d'utiliser `@maplibre/maplibre-react-native` avec tuiles OpenStreetMap / CartoDB. Si l'application tourne dans **Expo Go** ou un environnement sans binaire natif pré-compilé (`MLRNCameraModule`), un fallback interactif fluide s'active automatiquement sans provoquer de crash au chargement du module.
- **`MapHeaderSearch`** : Barre de recherche et filtres de catégories.
- **`PoiDetailCard`** : Carte d'affichage des détails d'un lieu sélectionné (note, avis, prix, boutons d'action).
- **`StyleSelector`** : Widget de sélection du style de carte (Dark, Light, Satellite).
- **`useMapStore`** : Store Zustand pour l'état de la carte (POIs, filtres, mode de style, centrage).

## 🧪 Tests

Les tests unitaires et de composants se trouvent dans `src/features/carte/__tests__/` :
- `MapViewComponent.test.tsx`
- `PoiDetailCard.test.tsx`
- `useMapStore.test.ts`
