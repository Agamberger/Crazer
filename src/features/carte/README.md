# 📍 Feature Carte & Explorer (`src/features/carte`)

Ce module gère l'affichage de la carte interactive, des lieux (Places) et des sélections pour les sorties de groupe.

## 🏗️ Architecture des Composants

- **`MapViewComponent`** : Composant cartographique principal.
  - *Mode Natif (Dev Client)* : Utilise `@maplibre/maplibre-react-native` pour un rendu vectoriel 3D haute performance.
  - *Expo Go mode (development)*: renders the fallback **Leaflet** map in `react-native-webview`. Its basemap is the same **OpenFreeMap vector style** as on native, drawn by MapLibre GL JS through the `@maplibre/maplibre-gl-leaflet` binding (WebGL required); Leaflet keeps the markers, centring and messages. This gives a **real, fully working map directly in Expo Go**, with no native binary to compile.
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
  - **`OutingPickerStep`** : choix d'une sortie existante (réutilise `OutingCard`) ; les sorties dont l'utilisateur est seulement invité ou qu'il a refusées ne sont pas proposées (`useVisibleOutings`) ;
  - **`PlannedStepForm`** : détails de l'étape, préremplis par `buildPlannedStepValues()`.
  Le succès est signalé par un **toast** (`@/shared/store/useToastStore`).
  - **« + Créer une nouvelle sortie »** appelle la prop obligatoire `onCreateNewOuting(place)`. `app/(tabs)/carte.tsx` enregistre alors le lieu (`ensurePlaceExists`) puis ouvre l'assistant `/outing/create?placeId=…&placeName=…` : le titre est prérempli et le lieu devient la première étape de la sortie. En cas d'erreur, le message reste dans la modale (un toast serait masqué par la `Modal` plein écran) ; en cas de succès, la modale se ferme.
- **`constants.ts`** : `PLACE_CATEGORY_LABELS` / `getPlaceCategoryLabel()` (libellés et couleurs des catégories), `MAP_STYLE_URLS` and `MAP_ATTRIBUTION_HTML` (basemap, see below).
- **`StyleSelector`** : map style picker (« Sombre » → `dark`, « Coloré » → `liberty`, « Clair » → `positron`).
- **`useMapStore`** : Store Zustand pour l'état de la carte (Places, filtres, mode de style, centrage).

## 🔎 Google Places (API New, live data only)

Google Maps Platform terms allow storing **only the Google place ID** (indefinitely; refresh it when older than 12 months). Names, addresses, photos, ratings and opening hours must **never** be persisted: they are fetched live and kept in memory for the session. See `docs/SUPABASE.md` (« Lieux Google ») for the storage rule.

- **`services/googlePlaces/`** (public API in `index.ts`):
  - `googlePlacesClient.ts` — REST calls to `https://places.googleapis.com/v1` (Autocomplete New, Place Details New with an `X-Goog-FieldMask`, photo media URLs). Two tiers: `summary` (`id`, `displayName`, `formattedAddress`, `location`, `types`, `googleMapsUri` → Place Details **Pro** SKU) for lists, `details` (adds rating, hours, phone, website, photos → **Enterprise** SKU) only when a place card opens.
  - `googlePlacesParsers.ts` — narrows the `unknown` JSON into typed values (no `any`).
  - `googlePlacesError.ts` — `GooglePlacesError` with a `kind` (`missing_key`, `invalid_key`, `quota_exceeded`, `not_found`, `invalid_request`, `network`, `invalid_response`) and a French `userMessage`.
  - `googlePlacesRepository.ts` — **session memory cache** (300 places / 1 h, 100 predictions / 5 min, LRU), merged concurrent requests, details reused for summaries, `not_found` remembered, **quota guard** (no Google call for 5 min after a `RESOURCE_EXHAUSTED` / HTTP 429). Emptied at logout (`registerUserScopedReset`). Nothing is written to disk.
  - `googlePlaceMappers.ts` — `googlePlaceToPlaceItem` (category from Google types computed on display, price level, photo URLs with their author in `imageCredits`).
- **Hooks**: `useGooglePlaceSummaries(placeIds)` (lists) and `useGooglePlaceDetails(placeId)` (place card) return `{ status: 'loading' | 'ready' | 'unavailable' }`.
- **Search bar**: `usePlaceAutocomplete` uses `searchGooglePlacePredictions` + `getGooglePlaceDetails` with one session token; failures are shown under the bar (`searchError`, `testID="map-search-error"`).
- **Key**: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, with **Places API (New)** enabled (CORS is supported, so the web build calls it directly).

## 🗺️ Basemap tiles (OpenFreeMap)

- **Provider**: [OpenFreeMap](https://openfreemap.org) — free OpenStreetMap vector tiles for MapLibre, **no API key, no usage limit, no registration**, open source. It replaced CARTO, whose free tier needs an API key, stops at 1M tile requests/month for commercial use and can be suspended at any time.
- **Styles**: `MAP_STYLE_URLS` (`constants.ts`, `Record<MapStyleMode, string>`) is the single source of the style URLs, shared by native MapLibre (`NativeMapLibreView`) and the Leaflet fallback (`utils/leafletMap.ts`):

  | `MapStyleMode` | OpenFreeMap style | UI label |
  | :--- | :--- | :--- |
  | `dark` (default) | `https://tiles.openfreemap.org/styles/dark` | Sombre |
  | `liberty` | `https://tiles.openfreemap.org/styles/liberty` | Coloré |
  | `positron` | `https://tiles.openfreemap.org/styles/positron` | Clair |

  Other available styles: `bright`, `fiord`.
- **Attribution (required)**: « © OpenFreeMap © OpenMapTiles Data from OpenStreetMap ». On web / Expo Go it is passed explicitly to the Leaflet attribution control (`MAP_ATTRIBUTION_HTML`); on native, MapLibre's attribution control (`attributionEnabled`) shows the attribution declared by the style's tile source. Never hide either control.
- **Terms**: the public instance is provided **as-is, without SLA**; the data is © OpenStreetMap contributors (ODbL). See the [terms of use](https://openfreemap.org/tos/) and the [quick start](https://openfreemap.org/quick_start/).
- **Pinned browser builds** (fallback map document, `LEAFLET_MAP_ASSETS`): Leaflet 1.9.4, MapLibre GL JS 5.24.1, `@maplibre/maplibre-gl-leaflet` 0.1.3, loaded from unpkg.
- **Self-hosting option**: if the public instance ever becomes a risk, OpenFreeMap can be self-hosted (open-source scripts on a single server, see [github.com/hyperknot/openfreemap](https://github.com/hyperknot/openfreemap)); only `OPENFREEMAP_STYLES_BASE_URL` in `constants.ts` would change.

### Sous-composants (découpage des composants de plus de 200 lignes)

- **`utils/mapLibreModule.ts`** : résolution sûre de `@maplibre/maplibre-react-native` (`isMapLibreAvailable`, `MapLibreMap`, `MapLibreCamera`, `MapLibreMarker`). Sur le web ou dans Expo Go, les composants retombent sur `View` et `MapViewComponent` affiche le fallback Leaflet.
- **`NativeMapLibreView`** : carte vectorielle MapLibre native (caméra, position de l'utilisateur, marqueurs), rendue par `MapViewComponent` quand le module natif est présent. Elle s'appuie sur **`NativePlaceMarker`** (emoji de catégorie, nom du lieu sélectionné) et **`UserLocationMarker`** (point bleu « Votre position »).
- **`PlannedStepEditStep`** : seconde étape de `AddPlaceToOutingModal` (rappel de la sortie choisie, bouton « Changer », `PlannedStepForm`).
- **`TargetOutingBanner`** : bannière « 🎯 Ajout à la sortie » de l'écran Carte (`app/(tabs)/carte.tsx`) quand des lieux sont ajoutés à une sortie précise, ou « 💡 Proposer une activité pour » quand `useMapStore.targetKind` vaut `'activity'` (the place card button then reads « + Proposer comme activité » and the screen opens `ProposePlaceActivityModal` from the outings feature).
- **`PlaceDetailCard`** se compose de **`PlaceDetailHeader`** (catégorie, prix, ouvert / fermé, boutons agrandir / enregistrer / fermer), **`PlacePhotoGallery`** (photos), **`PlaceContactChips`** (appel et site web, en mode agrandi) et **`PlaceDetailActions`** (« Itinéraire », « Ajouter à une sortie »).
- **`MapHeaderSearch`** délègue l'autocomplétion Google Places au hook **`usePlaceAutocomplete`** (délai de 350 ms, 2 caractères minimum, réponses périmées ignorées, un jeton de session pour les frappes et le détail du lieu choisi). Il affiche **`PlacePredictionsDropdown`** (suggestions) et **`CategoryFilterChips`** (filtres `MAP_CATEGORY_FILTERS`).

Tests associés : `mapLibreModule.test.ts`, `NativeMapLibreView.test.tsx`, `NativePlaceMarker.test.tsx`, `UserLocationMarker.test.tsx`, `PlannedStepEditStep.test.tsx`, `TargetOutingBanner.test.tsx`, `PlaceDetailHeader.test.tsx`, `PlacePhotoGallery.test.tsx`, `PlaceContactChips.test.tsx`, `PlaceDetailActions.test.tsx`, `PlacePredictionsDropdown.test.tsx`, `CategoryFilterChips.test.tsx`, `usePlaceAutocomplete.test.ts`.

## 🧪 Tests

Les tests unitaires et de composants se trouvent dans `src/features/carte/__tests__/` :
- `MapViewComponent.test.tsx`
- `PlaceDetailCard.test.tsx`
- `AddPlaceToOutingModal.test.tsx`
- `MapHeaderSearch.test.tsx`
- `placeService.test.ts`
- `googlePlacesService.test.ts` (session tokens)
- `googlePlacesClient.test.ts`, `googlePlacesRepository.test.ts` (cache, quota guard, logout), `sessionMemoryCache.test.ts`, `googlePlaceMappers.test.ts`, `useGooglePlaces.test.ts`
- `usePlaces.test.ts`
- `leafletMapScript.test.ts` (exécute le script Leaflet avec un faux `L` : centrage, zone visible, marqueurs, fond de carte OpenFreeMap)
- `leafletTiles.test.tsx` (OpenFreeMap style URLs, attribution, no CARTO / raster tiles)
- `StyleSelector.test.tsx`
- `useMapStore.test.ts`
- `googlePhotos.test.ts` (aucune clé API dans les données persistées)
