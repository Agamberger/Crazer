import { create } from 'zustand';
import {
  bindSetToSession,
  captureUserSession,
  registerUserScopedReset,
  registerUserScopedStore,
  resetUserScopedStores,
} from '@/shared/store/sessionReset';

interface CounterState {
  items: string[];
  add: (item: string) => void;
}

describe('sessionReset', () => {
  it('remet un store enregistré à son état initial', () => {
    const useCounter = create<CounterState>((set) => ({
      items: [],
      add: (item) => set((state) => ({ items: [...state.items, item] })),
    }));
    const unregister = registerUserScopedStore(useCounter);

    useCounter.getState().add('donnée privée');
    resetUserScopedStores();

    expect(useCounter.getState().items).toEqual([]);
    expect(typeof useCounter.getState().add).toBe('function');
    unregister();
  });

  it("continue la remise à zéro même si un store échoue", () => {
    const failing = jest.fn(() => {
      throw new Error('boom');
    });
    const ok = jest.fn();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const unregisterFailing = registerUserScopedReset(failing);
    const unregisterOk = registerUserScopedReset(ok);

    resetUserScopedStores();

    expect(failing).toHaveBeenCalled();
    expect(ok).toHaveBeenCalled();
    unregisterFailing();
    unregisterOk();
    spy.mockRestore();
  });

  it("n'appelle plus un reset désenregistré", () => {
    const reset = jest.fn();
    const unregister = registerUserScopedReset(reset);
    unregister();

    resetUserScopedStores();

    expect(reset).not.toHaveBeenCalled();
  });
  it('captureUserSession devient faux après une remise à zéro', () => {
    const isCurrent = captureUserSession();
    expect(isCurrent()).toBe(true);

    resetUserScopedStores();

    expect(isCurrent()).toBe(false);
    expect(captureUserSession()()).toBe(true);
  });

  it('bindSetToSession ignore les écritures après une déconnexion', () => {
    const useCounter = create<CounterState>((set) => ({
      items: [],
      add: (item) => set((state) => ({ items: [...state.items, item] })),
    }));
    const setLive = bindSetToSession(useCounter.setState);

    setLive({ items: ['avant'] });
    expect(useCounter.getState().items).toEqual(['avant']);

    resetUserScopedStores();
    setLive({ items: ['réponse tardive'] });

    expect(useCounter.getState().items).toEqual(['avant']);
  });
});
