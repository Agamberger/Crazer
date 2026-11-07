import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ToastHost } from '@/shared/components';
import { toast, useToastStore } from '@/shared/store/useToastStore';

describe('ToastHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => useToastStore.getState().clear());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("n'affiche rien sans toast", () => {
    const { queryByTestId } = render(<ToastHost />);
    expect(queryByTestId('toast')).toBeNull();
  });

  it('affiche le toast courant avec son titre et son message', () => {
    const { getByText, getByRole } = render(<ToastHost />);
    act(() => {
      toast.success('Sortie créée', { title: 'Bravo' });
    });
    expect(getByText('Bravo')).toBeTruthy();
    expect(getByText('Sortie créée')).toBeTruthy();
    expect(getByRole('alert')).toBeTruthy();
  });

  it('disparaît automatiquement après sa durée et affiche le suivant', () => {
    const { getByText, queryByText } = render(<ToastHost />);
    act(() => {
      toast.info('Premier', { duration: 2000 });
      toast.info('Second', { duration: 2000 });
    });
    expect(getByText('Premier')).toBeTruthy();
    expect(queryByText('Second')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(queryByText('Premier')).toBeNull();
    expect(getByText('Second')).toBeTruthy();
  });

  it('se ferme au toucher', () => {
    const { getByTestId, queryByText } = render(<ToastHost />);
    act(() => {
      toast.error('Erreur réseau');
    });
    fireEvent.press(getByTestId('toast'));
    expect(queryByText('Erreur réseau')).toBeNull();
  });
});
