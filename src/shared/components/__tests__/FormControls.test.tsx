import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Checkbox, SearchBar, SegmentedControl, TextField, Toggle } from '@/shared/components';

const floating = StyleSheet.create({ bar: { marginHorizontal: 16 } });

describe('TextField', () => {
  it("peut rétrécir dans son conteneur (sur le web, un <input> a une largeur intrinsèque qui déborde)", () => {
    const { getByTestId } = render(
      <TextField variant="title" value="Soirée Burger & Bowling" onChangeText={() => {}} testID="input-title" />
    );
    expect(StyleSheet.flatten(getByTestId('input-title').props.style)).toEqual(
      expect.objectContaining({ flex: 1, minWidth: 0 })
    );
  });

  it('affiche le label et transmet la saisie', () => {
    const onChangeText = jest.fn();
    const { getByText, getByTestId } = render(
      <TextField label="Email" value="" onChangeText={onChangeText} testID="email" />,
    );
    expect(getByText('Email')).toBeTruthy();
    fireEvent.changeText(getByTestId('email'), 'a@b.fr');
    expect(onChangeText).toHaveBeenCalledWith('a@b.fr');
  });

  it("affiche l'erreur à la place du texte d'aide", () => {
    const { getByText, queryByText } = render(
      <TextField label="Email" helperText="Aide" error="Email invalide" />,
    );
    expect(getByText('Email invalide')).toBeTruthy();
    expect(queryByText('Aide')).toBeNull();
  });

  it('bascule la visibilité du mot de passe', () => {
    const { getByTestId, getByLabelText } = render(
      <TextField label="Mot de passe" isPassword testID="pwd" />,
    );
    expect(getByTestId('pwd').props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Afficher le mot de passe'));
    expect(getByTestId('pwd').props.secureTextEntry).toBe(false);
    expect(getByLabelText('Masquer le mot de passe')).toBeTruthy();
  });

  it('affiche le compteur de caractères', () => {
    const { getByText } = render(<TextField value="abc" maxLength={10} showCounter />);
    expect(getByText('3/10')).toBeTruthy();
  });

  it('appelle onFocus / onBlur', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByTestId } = render(<TextField testID="f" onFocus={onFocus} onBlur={onBlur} />);
    fireEvent(getByTestId('f'), 'focus');
    fireEvent(getByTestId('f'), 'blur');
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it('passe en zone de texte multiligne avec une hauteur minimale', () => {
    const { getByTestId } = render(
      <TextField label="Description" multiline minHeight={120} testID="desc" />,
    );
    const input = getByTestId('desc');
    expect(input.props.multiline).toBe(true);
    expect(input).toHaveStyle({ minHeight: 120, textAlignVertical: 'top' });
  });

  it('variante title : grand texte en gras, sans cadre, avec soulignement', () => {
    const { getByTestId } = render(<TextField variant="title" testID="titre" />);
    expect(getByTestId('titre')).toHaveStyle({ fontSize: 28, fontWeight: '700' });
    expect(getByTestId('titre-wrapper')).toHaveStyle({
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderBottomWidth: 1,
    });
  });

  it("déclenche l'action de l'icône droite", () => {
    const onPressRightIcon = jest.fn();
    const { getByTestId } = render(
      <TextField testID="f" rightIcon="calendar" onPressRightIcon={onPressRightIcon} />,
    );
    fireEvent.press(getByTestId('f-right-icon'));
    expect(onPressRightIcon).toHaveBeenCalled();
  });
});

describe('SearchBar', () => {
  it('applique containerStyle au conteneur (ex : barre flottante)', () => {
    const { getByTestId } = render(
      <SearchBar
        value=""
        onChangeText={jest.fn()}
        containerStyle={floating.bar}
        testID="search"
      />,
    );
    expect(getByTestId('search-container')).toHaveStyle({ marginHorizontal: 16 });
  });

  it('efface la recherche via la croix', () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const { getByLabelText } = render(
      <SearchBar value="bar" onChangeText={onChangeText} onClear={onClear} />,
    );
    fireEvent.press(getByLabelText('Effacer la recherche'));
    expect(onChangeText).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();
  });

  it("n'affiche pas la croix si le champ est vide et affiche le loader", () => {
    const { queryByLabelText, getByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} loading />,
    );
    expect(queryByLabelText('Effacer la recherche')).toBeNull();
    expect(getByTestId('search-bar-loader')).toBeTruthy();
  });
});

describe('Checkbox', () => {
  it("inverse l'état au clic", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<Checkbox checked={false} onChange={onChange} label="CGU" />);
    fireEvent.press(getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('expose son état coché', () => {
    const { getByRole } = render(<Checkbox checked onChange={jest.fn()} label="CGU" />);
    expect(getByRole('checkbox').props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });
  });
});

describe('Toggle', () => {
  it('transmet le changement de valeur', () => {
    const onValueChange = jest.fn();
    const { getByTestId, getByText } = render(
      <Toggle value={false} onValueChange={onValueChange} label="Notifications" testID="t" />,
    );
    expect(getByText('Notifications')).toBeTruthy();
    fireEvent(getByTestId('t'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'upcoming', label: 'À venir' },
    { value: 'past', label: 'Passées' },
  ] as const;

  it("sélectionne l'option touchée", () => {
    const onChange = jest.fn();
    const { getByText, getByTestId } = render(
      <SegmentedControl options={options} value="upcoming" onChange={onChange} testID="seg" />,
    );
    expect(getByTestId('seg-upcoming').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByText('Passées'));
    expect(onChange).toHaveBeenCalledWith('past');
  });
});
