import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Badge, Button, List, ListItem, SectionHeader } from '@/shared/components';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: '1', name: 'Bowling' },
  { id: '2', name: 'Karaoké' },
];

describe('ListItem', () => {
  it('affiche titre, sous-titre et chevron quand cliquable', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ListItem title="Profil" subtitle="Modifier" onPress={onPress} />);
    expect(getByText('Modifier')).toBeTruthy();
    expect(getByText('chevron-forward')).toBeTruthy();
    fireEvent.press(getByText('Profil'));
    expect(onPress).toHaveBeenCalled();
  });

  it("n'affiche pas de chevron si un élément droit est fourni", () => {
    const { queryByText, getByText } = render(
      <ListItem title="Demandes" right={<Badge label={3} />} onPress={jest.fn()} />,
    );
    expect(getByText('3')).toBeTruthy();
    expect(queryByText('chevron-forward')).toBeNull();
  });

  it("garde l'élément droit hors de la zone cliquable (accessible séparément)", () => {
    const onPress = jest.fn();
    const onAction = jest.fn();
    const { getByLabelText, getByTestId } = render(
      <ListItem
        title="Sophie"
        onPress={onPress}
        right={<Button title="Ajouter" size="sm" onPress={onAction} />}
        testID="row"
      />,
    );
    // Le bouton de droite ne doit pas être un descendant du bouton de la ligne,
    // sinon VoiceOver / TalkBack ne peuvent pas l'atteindre.
    const row = getByTestId('row');
    const action = getByLabelText('Ajouter');
    let parent = action.parent;
    while (parent) {
      expect(parent).not.toBe(row);
      parent = parent.parent;
    }
    fireEvent.press(action);
    expect(onAction).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("n'est pas un bouton sans onPress", () => {
    const { queryByRole } = render(<ListItem title="Info" icon="information-circle" />);
    expect(queryByRole('button')).toBeNull();
  });
});

describe('SectionHeader', () => {
  it("déclenche l'action", () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Mes amis" actionLabel="Voir tout" onAction={onAction} />,
    );
    fireEvent.press(getByText('Voir tout'));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('List', () => {
  const renderItem = ({ item }: { item: Item }) => <Text>{item.name}</Text>;

  it('rend les éléments', () => {
    const { getByText } = render(
      <List data={ITEMS} renderItem={renderItem} keyExtractor={(i) => i.id} gap="sm" />,
    );
    expect(getByText('Bowling')).toBeTruthy();
    expect(getByText('Karaoké')).toBeTruthy();
  });

  it('affiche le loader au premier chargement', () => {
    const { getByTestId, queryByText } = render(<List data={[]} renderItem={renderItem} loading />);
    expect(getByTestId('list-loader')).toBeTruthy();
    expect(queryByText('Bowling')).toBeNull();
  });

  it("affiche l'état vide", () => {
    const { getByText } = render(
      <List data={[]} renderItem={renderItem} empty={{ title: 'Rien ici' }} />,
    );
    expect(getByText('Rien ici')).toBeTruthy();
  });

  it("affiche l'erreur et le header", () => {
    const { getByText } = render(
      <List
        data={ITEMS}
        renderItem={renderItem}
        error="Réseau indisponible"
        ListHeaderComponent={<Text>En-tête</Text>}
      />,
    );
    expect(getByText('Réseau indisponible')).toBeTruthy();
    expect(getByText('En-tête')).toBeTruthy();
  });

  it('accepte un composant comme header', () => {
    const Header = () => <Text>Header composant</Text>;
    const { getByText } = render(
      <List data={ITEMS} renderItem={renderItem} ListHeaderComponent={Header} />,
    );
    expect(getByText('Header composant')).toBeTruthy();
  });
});
