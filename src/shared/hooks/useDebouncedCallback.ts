import { useCallback, useEffect, useRef } from 'react';

/** Délai par défaut entre la dernière frappe et l'appel réseau (ms). */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Retourne une version « debounced » de `callback` : l'appel n'est exécuté
 * qu'après `delayMs` sans nouvel appel. La dernière version de `callback` est
 * toujours utilisée, et l'appel en attente est annulé au démontage.
 * `cancel()` annule un appel en attente (ex. saisie vidée).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
): { run: (...args: Args) => void; cancel: () => void } {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const run = useCallback(
    (...args: Args) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [cancel, delayMs],
  );

  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
