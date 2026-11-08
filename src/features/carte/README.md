# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des lieux (Places) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Mode Expo Go (Développement)* : Intègre automatiquement une carte **OpenStreetMap / Leaflet** interactive via `react-native-webview` (tuiles OpenStreetMap, avec un filtre CSS d'inversion pour le style sombre : les tuiles raster CARTO exigent une clé API). Cela permet d'avoir une **vraie carte totalement fonctionnelle directement dans Expo Go**, sans aucun crash ni compilation de binaire natif requis !
  - *Mode Web (`npm run web`)* : `react-native-webview` n'existe pas sur le web, la même carte Leaflet est donc affichée dans une `<iframe>` (`LeafletWebFrame`). Le HTML n'est rechargé que si le style change : marqueurs, sélection et centrage sont envoyés par `postMessage`, et les clics sur les marqueurs remontent à l'app de la même façon. Le HTML Leaflet commun (WebView et iframe) est généré par `utils/leafletMap.ts`, qui échappe les données des lieux (`serializeForScript`) pour qu'un nom contenant `</script>` ne puisse pas injecter de code.
  - *Comportement commun du fallback Leaflet* : le HTML n'est construit qu'une fois par style, y compris dans la WebView native ; ensuite tout passe par `injectJavaScript` / `postMessage`. La carte ne se recentre que sur une **nouvelle demande de centrage** (`centerVersion` du store, incrémenté par `setCenterRegion`) : charger des lieux ou changer de filtre ne la ramène plus en arrière après un déplacement manuel. À chaque fin de déplacement ou de zoom (et au chargement), la carte envoie sa **zone visible** (`REGION_CHANGE` : centre, zoom, rayon couvrant l'écran) ; `MapViewComponent` la remonte via `onRegionChange`, et l'écran Carte appelle `usePlaces().loadVisibleArea`, qui recharge les lieux Supabase de cette zone (délai de 400 ms, rayon borné entre 2 km et 1 000 km, 100 lieux max). Les lieux s'affichent donc même sans géolocalisation, et partout où l'on se déplace.
- **`MapHeaderSearch`** : Barre de recherche (`SearchBar`) et filtres de catégories (`Chip`) avec autocomplétion Google Places (délai de 350 ms, réponses périmées ignorées). Un **jeton de session** (hook `usePlacesSessionToken`) est partagé par les frappes et la requête de détail qui conclut la recherche : Google facture alors une seule session au lieu d'une requête par frappe. Le jeton est renouvelé après la sélection d'un lieu, quand le champ est vidé (recherche abandonnée) et après 3 minutes (`PLACES_SESSION_TTL_MS`).
- **Photos Google (`utils/googlePhotos.ts`)** : la clé API n'est **jamais** stockée en base. `placeItemToCreatePlaceDto` convertit les photos Google en références `google-photo:<photo_reference>` (`toStorableImageRef`), et `placeToPlaceItem` reconstruit l'URL avec la clé de l'app à l'affichage (`toDisplayImageUrl`). La migration `scrub_google_api_keys_from_places` a nettoyé les URLs déjà enregistrées.
- **Persistance des lieux (`placeService.upsertPlace`)** : un lieu est rattaché à une ligne existante s'il a le même provider + `source_id`, ou le **même nom à moins de 75 m** (casse et accents ignorés, via `search_places`). Sinon il est créé. Un lieu existant n'est jamais réécrit, et les coordonnées invalides (ou `0,0`) sont refusées. Les erreurs Supabase sont propagées au lieu de créer des doublons.
- **Recherche (`search_places`)** : la saisie est découpée en mots (tous requis, en préfixe, sans accents) ; les caractères spéciaux ne provoquent plus d'erreur. Le rayon est borné à 1 000 km et le nombre de résultats à 100 côté SQL.
- **Note d'un lieu** : `rating = 0` signifie « pas de note » ; aucune note n'est inventée et `PlaceDetailCard` masque alors la ligne ⭐.
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
- `googlePhotos.test.ts` (aucune clé API dans les données persistées)
