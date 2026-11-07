# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des lieux (Places) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Mode Expo Go (Développement)* : Intègre automatiquement une carte **OpenStreetMap / Leaflet** interactive via `react-native-webview` (tuiles OpenStreetMap, avec un filtre CSS d'inversion pour le style sombre : les tuiles raster CARTO exigent une clé API). Cela permet d'avoir une **vraie carte totalement fonctionnelle directement dans Expo Go**, sans aucun crash ni compilation de binaire natif requis !
  - *Mode Web (`npm run web`)* : `react-native-webview` n'existe pas sur le web, la même carte Leaflet est donc affichée dans une `<iframe>` (`LeafletWebFrame`). Le HTML n'est rechargé que si le style change : marqueurs, sélection et centrage sont envoyés par `postMessage`, et les clics sur les marqueurs remontent à l'app de la même façon. Le HTML Leaflet commun (WebView et iframe) est généré par `utils/leafletMap.ts`, qui échappe les données des lieux (`serializeForScript`) pour qu'un nom contenant `</script>` ne puisse pas injecter de code.
  - *Comportement commun du fallback Leaflet* : le HTML n'est construit qu'une fois par style, y compris dans la WebView native ; ensuite tout passe par `injectJavaScript` / `postMessage`. La carte ne se recentre que sur une **nouvelle demande de centrage** (`centerVersion` du store, incrémenté par `setCenterRegion`) : charger des lieux ou changer de filtre ne la ramène plus en arrière après un déplacement manuel. À chaque fin de déplacement ou de zoom (et au chargement), la carte envoie sa **zone visible** (`REGION_CHANGE` : centre, zoom, rayon couvrant l'écran) ; `MapViewComponent` la remonte via `onRegionChange`, et l'écran Carte appelle `usePlaces().loadVisibleArea`, qui recharge les lieux Supabase de cette zone (délai de 400 ms, rayon borné entre 2 km et 1 000 km, 100 lieux max). Les lieux s'affichent donc même sans géolocalisation, et partout où l'on se déplace.
- **`MapHeaderSearch`** : Barre de recherche (`SearchBar`) et filtres de catégories (`Chip`) avec autocomplétion Google Places.
- **Géolocalisation (`usePlaces.requestLocation`)** : la position est demandée « fraîche » (`maximumAge: 0`, délai max 15 s). Sur le web, expo-location acceptait sinon une position en cache de n'importe quel âge, éventuellement prise ailleurs. La dernière position connue n'est utilisée pour un centrage immédiat que si elle a moins de 2 minutes. Les chargements de lieux concurrents sont ordonnés : seule la réponse du plus récent met la carte à jour.
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
- `leafletMapScript.test.ts` (exécute le script Leaflet avec un faux `L` : centrage, zone visible, marqueurs)
- `useMapStore.test.ts`
