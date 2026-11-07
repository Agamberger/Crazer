import { act } from '@testing-library/react-native';
import { DEFAULT_TOAST_DURATION, toast, useToastStore } from '@/shared/store/useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    act(() => useToastStore.getState().clear());
  });

  it('ajoute un toast avec les valeurs par défaut', () => {
    act(() => {
      useToastStore.getState().show({ message: 'Bonjour' });
    });
    const [current] = useToastStore.getState().queue;
    expect(current).toMatchObject({
      message: 'Bonjour',
      tone: 'info',
      duration: DEFAULT_TOAST_DURATION,
    });
    expect(current.id).toEqual(expect.any(String));
  });

  it('met les toasts en file et retire le premier avec hide()', () => {
    act(() => {
      toast.success('Un');
      toast.error('Deux');
    });
    expect(useToastStore.getState().queue.map((t) => t.message)).toEqual(['Un', 'Deux']);

    act(() => useToastStore.getState().hide());
    expect(useToastStore.getState().queue.map((t) => t.message)).toEqual(['Deux']);
  });

  it('retire un toast précis par son id', () => {
    let secondId = '';
    act(() => {
      toast.info('Un');
      secondId = toast.warning('Deux');
    });
    act(() => useToastStore.getState().hide(secondId));
    expect(useToastStore.getState().queue.map((t) => t.message)).toEqual(['Un']);
  });

  it('ignore un doublon identique déjà en file', () => {
    act(() => {
      toast.error('Erreur réseau');
      toast.error('Erreur réseau');
    });
    expect(useToastStore.getState().queue).toHaveLength(1);
  });

  it('applique le ton via les helpers et accepte un titre', () => {
    act(() => {
      toast.error('Impossible de sauvegarder', { title: 'Oups', duration: 1000 });
    });
    expect(useToastStore.getState().queue[0]).toMatchObject({
      tone: 'error',
      title: 'Oups',
      duration: 1000,
    });
  });
});
