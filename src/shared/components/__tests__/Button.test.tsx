import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Button, IconButton } from '@/shared/components';

describe('Button', () => {
  it('affiche le titre et déclenche onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Créer" onPress={onPress} />);
    fireEvent.press(getByText('Créer'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('affiche un loader et bloque le clic pendant le chargement', () => {
    const onPress = jest.fn();
    const { getByTestId, queryByText, getByRole } = render(
      <Button title="Envoyer" loading onPress={onPress} />,
    );
    expect(getByTestId('button-loader')).toBeTruthy();
    expect(queryByText('Envoyer')).toBeNull();
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(getByRole('button').props.accessibilityState).toEqual({ disabled: true, busy: true });
  });

  it('ne déclenche pas onPress quand il est désactivé', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Off" disabled onPress={onPress} />);
    fireEvent.press(getByText('Off'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('affiche les icônes gauche et droite', () => {
    const { getByText } = render(
      <Button title="Suivant" leftIcon="add" rightIcon="arrow-forward" />,
    );
    expect(getByText('add')).toBeTruthy();
    expect(getByText('arrow-forward')).toBeTruthy();
  });

  it.each(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const)(
    'rend la variante %s',
    (variant) => {
      const { getByText } = render(<Button title={variant} variant={variant} />);
      expect(getByText(variant)).toBeTruthy();
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('rend la taille %s', (size) => {
    const { getByText } = render(<Button title={`Bouton ${size}`} size={size} />);
    expect(getByText(`Bouton ${size}`)).toBeTruthy();
  });

  it('utilise le titre comme accessibilityLabel par défaut', () => {
    const { getByLabelText } = render(<Button title="Valider" />);
    expect(getByLabelText('Valider')).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('expose son label et déclenche onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <IconButton icon="close" accessibilityLabel="Fermer" onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('Fermer'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('est bloqué quand désactivé', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <IconButton icon="close" accessibilityLabel="Fermer" disabled onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('Fermer'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
