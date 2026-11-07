import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { MapStyleMode } from '../types/carte';
import {
  buildLeafletHtml,
  buildLeafletUpdateMessage,
  LeafletMapState,
  parseLeafletSelection,
} from '../utils/leafletMap';

export interface LeafletWebFrameProps {
  mapStyleMode: MapStyleMode;
  state: LeafletMapState;
  onSelectPlaceId: (id: string) => void;
}

const FRAME_STYLE = { border: 0, display: 'block', height: '100%', width: '100%' } as const;

/**
 * Carte Leaflet / OpenStreetMap pour le web, où `react-native-webview` n'existe pas.
 * Le HTML n'est rechargé que si le style change : les marqueurs et le centrage
 * sont mis à jour par `postMessage`.
 */
export const LeafletWebFrame: React.FC<LeafletWebFrameProps> = ({
  mapStyleMode,
  state,
  onSelectPlaceId,
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const onSelectRef = useRef(onSelectPlaceId);
  onSelectRef.current = onSelectPlaceId;

  // L'état initial est lu au moment du (re)chargement ; ensuite tout passe par postMessage.
  const html = useMemo(() => buildLeafletHtml(mapStyleMode, stateRef.current), [mapStyleMode]);

  const pushState = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(buildLeafletUpdateMessage(stateRef.current), '*');
  }, []);

  useEffect(() => {
    pushState();
  }, [state, pushState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return undefined;
    }
    const handleMessage = (event: MessageEvent) => {
      // On n'écoute que notre propre iframe.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const id = parseLeafletSelection(event.data);
      if (id) onSelectRef.current(id);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return React.createElement('iframe', {
    ref: frameRef,
    srcDoc: html,
    title: 'Carte OpenStreetMap',
    style: FRAME_STYLE,
    // Rattrape une mise à jour arrivée pendant le chargement de l'iframe.
    onLoad: pushState,
    'data-testid': 'leaflet-web-map',
  });
};
