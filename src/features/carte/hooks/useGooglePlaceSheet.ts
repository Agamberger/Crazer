import { useCallback, useEffect, useState } from 'react';
import { PlaceItem } from '../types/carte';

export interface GooglePlaceSheetState {
  /** Google place ID to show in the full-screen sheet, `null` when it is closed. */
  sheetPlaceId: string | null;
  open: () => void;
  close: () => void;
}

/**
 * Opens the full-screen Google place sheet as soon as a Google place is selected on the map,
 * and lets the user close / reopen it.
 *
 * @param selectedPlace - place selected on the map, or `null`
 * @returns the sheet state
 */
export function useGooglePlaceSheet(selectedPlace: PlaceItem | null): GooglePlaceSheetState {
  const googlePlaceId = selectedPlace?.googlePlaceId ?? null;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(googlePlaceId !== null);
  }, [googlePlaceId]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { sheetPlaceId: isOpen ? googlePlaceId : null, open, close };
}
