import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  tone: ToastTone;
  /** Durée d'affichage en millisecondes. */
  duration: number;
}

export interface ShowToastOptions {
  message: string;
  title?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastState {
  /** File d'attente : seul le premier élément est affiché. */
  queue: ToastItem[];
  /** Ajoute un toast et retourne son identifiant. */
  show: (options: ShowToastOptions) => string;
  /** Retire le toast `id`, ou le toast affiché si aucun id n'est fourni. */
  hide: (id?: string) => void;
  clear: () => void;
}

export const DEFAULT_TOAST_DURATION = 3000;

let counter = 0;
const nextId = (): string => {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
};

export const useToastStore = create<ToastState>((set, get) => ({
  queue: [],

  show: ({ message, title, tone = 'info', duration = DEFAULT_TOAST_DURATION }) => {
    // Évite d'empiler plusieurs fois le même message (ex : erreurs réseau répétées).
    const duplicate = get().queue.find(
      (item) => item.message === message && item.tone === tone && item.title === title,
    );
    if (duplicate) return duplicate.id;

    const id = nextId();
    set((state) => ({ queue: [...state.queue, { id, message, title, tone, duration }] }));
    return id;
  },

  hide: (id) =>
    set((state) => ({
      queue: id ? state.queue.filter((item) => item.id !== id) : state.queue.slice(1),
    })),

  clear: () => set({ queue: [] }),
}));

type ToastHelperOptions = Omit<ShowToastOptions, 'message' | 'tone'>;

const showWithTone =
  (tone: ToastTone) =>
  (message: string, options?: ToastHelperOptions): string =>
    useToastStore.getState().show({ ...options, message, tone });

/**
 * Raccourcis utilisables partout (composants, stores, services) :
 * `toast.success('Sortie créée')`, `toast.error(err.message)`.
 */
export const toast = {
  show: (options: ShowToastOptions) => useToastStore.getState().show(options),
  info: showWithTone('info'),
  success: showWithTone('success'),
  warning: showWithTone('warning'),
  error: showWithTone('error'),
  hide: (id?: string) => useToastStore.getState().hide(id),
};
