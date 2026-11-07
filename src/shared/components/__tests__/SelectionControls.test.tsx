import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChipGroup, DateTimeField } from '@/shared/components';

describe('ChipGroup', () => {
  const OPTIONS = [
    { value: 'draft', label: 'Brouillon', emoji: '📝' },
    { value: 'planned', label: 'Planifiée' },
  ] as const;

  it('affiche les options et marque la sélection', () => {
    const { getByText, getByTestId } = render(
      <ChipGroup options={OPTIONS} value="planned" onChange={jest.fn()} testID="status" />,
    );
    expect(getByText('📝 Brouillon')).toBeTruthy();
    expect(getByText('Planifiée')).toBeTruthy();
    expect(getByTestId('status-planned').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(getByTestId('status-draft').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('appelle onChange avec la valeur typée', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ChipGroup options={OPTIONS} value="planned" onChange={onChange} testID="status" />,
    );
    fireEvent.press(getByTestId('status-draft'));
    expect(onChange).toHaveBeenCalledWith('draft');
  });

  it('accepte des valeurs numériques et un label de groupe', () => {
    const onChange = jest.fn();
    const { getByText, getByTestId } = render(
      <ChipGroup
        label="Durée"
        options={[
          { value: 30, label: '30 min' },
          { value: 60, label: '1h' },
        ]}
        value={30}
        onChange={onChange}
        testID="duration"
      />,
    );
    expect(getByText('Durée')).toBeTruthy();
    fireEvent.press(getByTestId('duration-60'));
    expect(onChange).toHaveBeenCalledWith(60);
  });
});

describe('DateTimeField', () => {
  const DATE = new Date(2026, 10, 6, 18, 30);

  it('affiche la date et l’heure formatées avec les testID par défaut', () => {
    const { getByTestId, getByText } = render(
      <DateTimeField label="Début" value={DATE} onChange={jest.fn()} />,
    );
    expect(getByText('Début')).toBeTruthy();
    expect(getByTestId('btn-select-date')).toBeTruthy();
    expect(getByTestId('btn-select-time')).toBeTruthy();
    expect(getByTestId('formatted-time-text')).toHaveTextContent('18:30');
    expect(getByTestId('formatted-date-text')).toHaveTextContent(/6 novembre 2026/);
  });

  it('préfixe les testID avec testIDScope', () => {
    const { getByTestId } = render(
      <DateTimeField value={DATE} onChange={jest.fn()} testIDScope="planned" />,
    );
    expect(getByTestId('btn-select-planned-date')).toBeTruthy();
    expect(getByTestId('formatted-planned-time-text')).toBeTruthy();
  });

  it('ouvre le sélecteur et transmet la nouvelle date à la confirmation', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DateTimeField value={DATE} onChange={onChange} />,
    );
    fireEvent.press(getByTestId('btn-select-date'));
    expect(getByTestId('themed-datetimepicker-modal')).toBeTruthy();

    fireEvent.press(getByTestId('day-cell-15'));
    fireEvent.press(getByTestId('btn-picker-confirm'));

    const picked: Date = onChange.mock.calls[0][0];
    expect(picked.getDate()).toBe(15);
    expect(picked.getHours()).toBe(18);
    expect(queryByTestId('day-cell-15')).toBeNull();
  });
});
