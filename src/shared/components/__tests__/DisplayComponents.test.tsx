import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Chip,
  Divider,
  EmptyState,
  getInitials,
  InlineAlert,
  Loader,
} from '@/shared/components';

describe('AppText', () => {
  it('rend le texte et marque les titres comme header', () => {
    const { getByText, getByRole } = render(<AppText variant="h1">Titre</AppText>);
    expect(getByText('Titre')).toBeTruthy();
    expect(getByRole('header')).toBeTruthy();
  });
});

describe('Card', () => {
  it('rend ses enfants', () => {
    const { getByText } = render(
      <Card>
        <Text>Contenu</Text>
      </Card>,
    );
    expect(getByText('Contenu')).toBeTruthy();
  });

  it('devient cliquable avec onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Card onPress={onPress} variant="elevated">
        <Text>Sortie</Text>
      </Card>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it.each([
    ['Jean Dupont', undefined, 'JD'],
    ['Léa', undefined, 'LÉ'],
    [null, 'paul@mail.fr', 'PA'],
    ['  ', undefined, '?'],
  ])('getInitials(%p, %p) = %p', (name, fallback, expected) => {
    expect(getInitials(name, fallback)).toBe(expected);
  });

  it('affiche les initiales sans image', () => {
    const { getByText, getByLabelText } = render(<Avatar name="Jean Dupont" />);
    expect(getByText('JD')).toBeTruthy();
    expect(getByLabelText('Avatar de Jean Dupont')).toBeTruthy();
  });

  it("revient aux initiales si l'image échoue", () => {
    const { getByTestId, getByText } = render(
      <Avatar name="Jean Dupont" imageUrl="https://x/y.png" testID="av" />,
    );
    fireEvent(getByTestId('av-image'), 'error');
    expect(getByText('JD')).toBeTruthy();
  });

  it("réessaie d'afficher l'image quand imageUrl change après une erreur", () => {
    const { getByTestId, rerender } = render(
      <Avatar name="Jean Dupont" imageUrl="https://x/cassee.png" testID="av" />,
    );
    fireEvent(getByTestId('av-image'), 'error');
    rerender(<Avatar name="Jean Dupont" imageUrl="https://x/nouvelle.png" testID="av" />);
    expect(getByTestId('av-image').props.source).toEqual({ uri: 'https://x/nouvelle.png' });
  });

  it('affiche la pastille en ligne', () => {
    const { getByTestId } = render(<Avatar name="A" online testID="av" />);
    expect(getByTestId('av-online')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('plafonne les grands nombres', () => {
    const { getByText } = render(<Badge label={150} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('affiche un texte', () => {
    const { getByText } = render(<Badge label="Nouveau" tone="success" />);
    expect(getByText('Nouveau')).toBeTruthy();
  });
});

describe('Chip', () => {
  it('est sélectionnable', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Chip label="Escalade" selected onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Escalade' }));
    expect(onPress).toHaveBeenCalled();
  });

  it("affiche l'emoji séparément du label (label seul pour l'accessibilité)", () => {
    const { getByText, getByRole } = render(
      <Chip label="Confirmée" emoji="✅" onPress={jest.fn()} />,
    );
    expect(getByText('Confirmée')).toBeTruthy();
    expect(getByText('✅ Confirmée')).toBeTruthy();
    expect(getByRole('button', { name: 'Confirmée' })).toBeTruthy();
  });

  it('accepte un accessibilityLabel personnalisé', () => {
    const { getByRole } = render(
      <Chip label="Bars" onPress={jest.fn()} accessibilityLabel="Filtrer par catégorie Bars" />,
    );
    expect(getByRole('button', { name: 'Filtrer par catégorie Bars' })).toBeTruthy();
  });

  it('peut être retiré', () => {
    const onRemove = jest.fn();
    const { getByLabelText } = render(<Chip label="Cinéma" onRemove={onRemove} />);
    fireEvent.press(getByLabelText('Retirer Cinéma'));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('Divider', () => {
  it('affiche un label optionnel', () => {
    const { getByText } = render(<Divider label="ou" />);
    expect(getByText('ou')).toBeTruthy();
  });
});

describe('InlineAlert', () => {
  it('affiche le message et peut être fermée', () => {
    const onDismiss = jest.fn();
    const { getByText, getByLabelText, getByTestId } = render(
      <InlineAlert message="Oups" title="Erreur" onDismiss={onDismiss} testID="alert" />,
    );
    expect(getByText('Oups')).toBeTruthy();
    expect(getByTestId('alert').props.accessibilityRole).toBe('alert');
    fireEvent.press(getByLabelText('Fermer le message'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Loader', () => {
  it('affiche le message', () => {
    const { getByText, getByTestId } = render(<Loader message="Chargement…" fullScreen />);
    expect(getByText('Chargement…')).toBeTruthy();
    expect(getByTestId('loader')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it("affiche l'action seulement si label + callback", () => {
    const onAction = jest.fn();
    const { getByText, rerender, queryByText } = render(
      <EmptyState title="Aucune sortie" actionLabel="Créer" onAction={onAction} />,
    );
    fireEvent.press(getByText('Créer'));
    expect(onAction).toHaveBeenCalled();
    rerender(<EmptyState title="Aucune sortie" actionLabel="Créer" />);
    expect(queryByText('Créer')).toBeNull();
  });
});
