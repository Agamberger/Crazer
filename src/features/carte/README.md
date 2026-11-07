# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des lieux (Places) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Mode Expo Go (Développement)* : Intègre automatiquement une carte **OpenStreetMap / Leaflet** interactive via `react-native-webview` (tuiles OpenStreetMap, avec un filtre CSS d'inversion pour le style sombre : les tuiles raster CARTO exigent une clé API). Cela permet d'avoir une **vraie carte totalement fonctionnelle directement dans Expo Go**, sans aucun crash ni compilation de binaire natif requis !
- **`MapHeaderSearch`** : Barre de recherche (`SearchBar`) et filtres de catégories (`Chip`) avec autocomplétion Google Places.
- **`PlaceDetailCard`** : Fiche d'affichage des détails d'un lieu sélectionné (note, avis, prix, horaires, photos, boutons d'action). Le glisser / agrandir est géré par le hook **`usePlaceSheetGesture`**, les horaires par **`PlaceOpeningHours`**.
- **`AddPlaceToOutingModal`** : Modal plein écran (`AppModal`) pour ajouter un lieu à une sortie active, composée de :
  - **`PlaceSummaryBanner`** : rappel du lieu ;
  - **`OutingPickerStep`** : choix de la sortie (réutilise `OutingCard`) ;
  - **`PlannedStepForm`** : détails de l'étape, préremplis par `buildPlannedStepValues()`.
  Le succès et les erreurs de création de sortie sont signalés par un **toast** (`@/shared/store/useToastStore`).
- **`constants.ts`** : `PLACE_CATEGORY_LABELS` / `getPlaceCategoryLabel()` (libellés et couleurs des catégories).
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
