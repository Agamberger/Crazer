import { MapRegion, MapStyleMode, PlaceItem } from '../types/carte';

/**
 * Carte de repli Leaflet + OpenStreetMap, utilisée quand MapLibre (natif) est indisponible :
 * dans une WebView sur Expo Go, dans une <iframe> sur le web.
 */

export interface LeafletMapState {
  places: PlaceItem[];
  selectedPlaceId: string | null;
  center: MapRegion;
  userLocation: { latitude: number; longitude: number } | null;
}

export const CATEGORY_EMOJIS: Record<string, string> = {
  resto: '🍕',
  bar: '🍸',
  activite: '🎯',
  nature: '🌲',
  culture: '🎨',
  all: '📍',
};

/** Type du message envoyé par la page parente (web) pour mettre la carte à jour sans la recharger. */
export const LEAFLET_UPDATE_MESSAGE = 'UPDATE_MAP';

/**
 * Sérialise une valeur pour l'insérer dans un <script> inline.
 * `<` est échappé pour qu'un nom de lieu contenant `</script>` ne puisse pas fermer la balise,
 * et U+2028 / U+2029 car ils terminent une ligne dans du JavaScript ancien.
 */
export const serializeForScript = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const getTileUrl = (mode: MapStyleMode): string =>
  mode === 'dark'
    ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';

const stateArgs = (state: LeafletMapState): string =>
  [
    serializeForScript(state.places),
    serializeForScript(state.selectedPlaceId),
    serializeForScript(state.center),
    serializeForScript(state.userLocation),
  ].join(', ');

/** Script qui met à jour une carte déjà chargée (WebView native : `injectJavaScript`). */
export const buildLeafletUpdateScript = (state: LeafletMapState): string =>
  `if (typeof updateMapState === 'function') { updateMapState(${stateArgs(state)}); } true;`;

/** Document HTML complet de la carte Leaflet. */
export const buildLeafletHtml = (mode: MapStyleMode, state: LeafletMapState): string => {
  // Les tuiles raster sombres de CARTO exigent une clé API : on inverse les tuiles OSM standard.
  const darkTilesFilter =
    mode === 'dark'
      ? '.leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }'
      : '';
  const { center } = state;

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #121214; }
          ${darkTilesFilter}
          .leaflet-control-attribution { font-size: 9px !important; background: rgba(0,0,0,0.6) !important; color: #aaa !important; }
          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 19px;
            background-color: #1E2028;
            border: 2px solid #FF6B35;
            font-size: 18px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s ease;
          }
          .custom-marker.selected {
            background-color: #FF6B35;
            border-color: #FFFFFF;
            transform: scale(1.25);
            z-index: 9999 !important;
          }
          .user-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 7px;
            background-color: #3B82F6;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.3), 0 2px 5px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var EMOJIS = ${serializeForScript(CATEGORY_EMOJIS)};
          var map = L.map('map', { zoomControl: false }).setView([${Number(center.latitude)}, ${Number(center.longitude)}], ${Number(center.zoomLevel)});
          var markersLayer = L.layerGroup().addTo(map);
          var userLayer = L.layerGroup().addTo(map);

          L.tileLayer('${getTileUrl(mode)}', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // WebView native (Expo Go) ou page parente (iframe sur le web).
          function notify(payload) {
            var message = JSON.stringify(payload);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(message);
            } else if (window.parent && window.parent !== window) {
              window.parent.postMessage(message, '*');
            }
          }

          function updateMapState(placesData, selectedId, center, userLoc) {
            if (center && center.latitude && center.longitude) {
              map.flyTo([center.latitude, center.longitude], center.zoomLevel || map.getZoom());
            }
            userLayer.clearLayers();
            if (userLoc && userLoc.latitude && userLoc.longitude) {
              var userIcon = L.divIcon({
                className: '',
                html: '<div class="user-marker" title="Votre position"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              L.marker([userLoc.latitude, userLoc.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(userLayer);
            }
            markersLayer.clearLayers();
            (placesData || []).forEach(function(place) {
              var isSelected = place.id === selectedId;
              var emoji = EMOJIS[place.category] || EMOJIS.all;
              var icon = L.divIcon({
                className: '',
                html: '<div class="custom-marker ' + (isSelected ? 'selected' : '') + '">' + emoji + '</div>',
                iconSize: [38, 38],
                iconAnchor: [19, 19]
              });
              var marker = L.marker([place.latitude, place.longitude], { icon: icon, title: place.title }).addTo(markersLayer);
              marker.on('click', function() {
                notify({ type: 'SELECT_PLACE', id: place.id });
              });
            });
          }

          // Web : la page parente envoie les mises à jour par postMessage.
          window.addEventListener('message', function(event) {
            if (event.source !== window.parent) return;
            try {
              var data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
              if (data && data.type === '${LEAFLET_UPDATE_MESSAGE}') {
                updateMapState(data.places, data.selectedPlaceId, data.center, data.userLocation);
              }
            } catch (e) {}
          });

          updateMapState(${stateArgs(state)});
        </script>
      </body>
      </html>
    `;
};

/** Message de mise à jour envoyé à l'iframe (web). */
export const buildLeafletUpdateMessage = (state: LeafletMapState): string =>
  JSON.stringify({ type: LEAFLET_UPDATE_MESSAGE, ...state });

/** Extrait l'id du lieu cliqué d'un message de la carte, ou `null` si le message est invalide. */
export const parseLeafletSelection = (data: unknown): string | null => {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { type, id } = parsed as { type?: unknown; id?: unknown };
    if ((type === 'SELECT_PLACE' || type === 'SELECT_POI') && typeof id === 'string') return id;
    return null;
  } catch {
    return null;
  }
};
