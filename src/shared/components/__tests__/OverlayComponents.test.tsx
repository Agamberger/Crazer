import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AppModal, ConfirmDialog, Screen } from '@/shared/components';

describe('AppModal', () => {
  it('affiche le titre et le contenu, et se ferme via la croix', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <AppModal visible title="Ajouter" onClose={onClose}>
        <Text>Corps</Text>
      </AppModal>,
    );
    expect(getByText('Ajouter')).toBeTruthy();
    expect(getByText('Corps')).toBeTruthy();
    fireEvent.press(getByTestId('app-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se ferme au toucher de l'arrière-plan sauf si désactivé", () => {
    const onClose = jest.fn();
    const { getByTestId, rerender } = render(
      <AppModal visible onClose={onClose} variant="sheet">
        <Text>Sheet</Text>
      </AppModal>,
    );
    fireEvent.press(getByTestId('app-modal-backdrop', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <AppModal visible onClose={onClose} dismissOnBackdrop={false}>
        <Text>Sheet</Text>
      </AppModal>,
    );
    fireEvent.press(getByTestId('app-modal-backdrop', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('variante fullScreen : pas d’arrière-plan, bouton de fermeture personnalisable', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId, getByLabelText, queryByTestId } = render(
      <AppModal
        visible
        variant="fullScreen"
        title="Mes amis"
        onClose={onClose}
        closeIcon="arrow-back"
        closeAccessibilityLabel="Retour"
        closeButtonTestID="btn-retour"
        footer={<Text>Pied</Text>}
      >
        <Text>Liste</Text>
      </AppModal>,
    );
    expect(getByText('Mes amis')).toBeTruthy();
    expect(getByText('Liste')).toBeTruthy();
    expect(getByText('Pied')).toBeTruthy();
    expect(queryByTestId('app-modal-backdrop', { includeHiddenElements: true })).toBeNull();
    expect(getByLabelText('Retour')).toBeTruthy();
    fireEvent.press(getByTestId('btn-retour'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("n'affiche rien quand invisible", () => {
    const { queryByText } = render(
      <AppModal visible={false} onClose={jest.fn()}>
        <Text>Caché</Text>
      </AppModal>,
    );
    expect(queryByText('Caché')).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('appelle onConfirm et onCancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Supprimer ?"
        message="Action irréversible"
        confirmLabel="Supprimer"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(getByText('Action irréversible')).toBeTruthy();
    fireEvent.press(getByText('Supprimer'));
    fireEvent.press(getByText('Annuler'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('Screen', () => {
  it('rend contenu, header et footer', () => {
    const { getByText, getByTestId } = render(
      <Screen scrollable avoidKeyboard header={<Text>Haut</Text>} footer={<Text>Bas</Text>}>
        <Text>Milieu</Text>
      </Screen>,
    );
    expect(getByTestId('screen')).toBeTruthy();
    expect(getByText('Haut')).toBeTruthy();
    expect(getByText('Milieu')).toBeTruthy();
    expect(getByText('Bas')).toBeTruthy();
  });
});
