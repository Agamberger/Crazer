import { StoreApi, UseBoundStore } from 'zustand';

/**
 * Registre des stores dont les données appartiennent à l'utilisateur connecté.
 *
 * Chaque store « user-scoped » s'enregistre ici ; à la déconnexion, le store d'auth
 * appelle `resetUserScopedStores()` pour que le compte suivant ne voie jamais les
 * sorties, amis ou lieux du précédent (appareil partagé).
 * `shared` ne dépend ainsi d'aucune feature.
 */
type ResetFn = () => void;

const resetters = new Set<ResetFn>();

/** Incrémenté à chaque remise à zéro : identifie la session utilisateur courante. */
let sessionGeneration = 0;

/**
 * Capture la session courante. La fonction retournée renvoie `false` dès qu'une
 * remise à zéro (déconnexion) a eu lieu : une réponse réseau arrivée ensuite
 * appartient au compte précédent et doit être ignorée.
 */
export function captureUserSession(): () => boolean {
  const generation = sessionGeneration;
  return () => generation === sessionGeneration;
}

/**
 * `set` Zustand lié à la session courante : à appeler au début d'une action
 * asynchrone, ses écritures sont ignorées si l'utilisateur s'est déconnecté entre-temps.
 */
export function bindSetToSession<T>(set: StoreApi<T>['setState']): StoreApi<T>['setState'] {
  const isCurrentSession = captureUserSession();
  return (partial, replace) => {
    if (isCurrentSession()) set(partial, replace);
  };
}

/** Enregistre une fonction de remise à zéro ; retourne de quoi la désenregistrer. */
export function registerUserScopedReset(reset: ResetFn): () => void {
  resetters.add(reset);
  return () => {
    resetters.delete(reset);
  };
}

/** Enregistre un store Zustand : il sera remis à son état initial à la déconnexion. */
export function registerUserScopedStore<T>(store: UseBoundStore<StoreApi<T>>): () => void {
  return registerUserScopedReset(() => store.setState(store.getInitialState(), true));
}

/** Remet à zéro tous les stores enregistrés (une erreur dans l'un n'empêche pas les autres). */
export function resetUserScopedStores(): void {
  // Invalide d'abord les requêtes en cours, puis vide les stores.
  sessionGeneration += 1;
  resetters.forEach((reset) => {
    try {
      reset();
    } catch (err: unknown) {
      console.error('[sessionReset] Échec de remise à zéro d’un store', err);
    }
  });
}
