import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DurationField } from '@/features/outings/components/DurationField';
import { DURATION_PRESETS, PLANNED_STATUS_OPTIONS } from '@/features/outings/constants';

describe('DurationField', () => {
  it('affiche les presets et la durée courante dans le champ personnalisé', () => {
    const { getByText, getByTestId } = render(<DurationField value={90} onChange={jest.fn()} />);
    expect(getByText('Durée estimée')).toBeTruthy();
    DURATION_PRESETS.forEach((preset) => expect(getByText(preset.label)).toBeTruthy());
    expect(getByTestId('input-planned-duration').props.value).toBe('90');
    expect(getByTestId('chip-duration-90').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('sélectionne un preset', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<DurationField value={null} onChange={onChange} />);
    fireEvent.press(getByTestId('chip-duration-120'));
    expect(onChange).toHaveBeenCalledWith(120);
  });

  it('ne garde que les chiffres de la saisie libre et renvoie null si vide', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<DurationField value={null} onChange={onChange} />);
    fireEvent.changeText(getByTestId('input-planned-duration'), '7a5');
    expect(onChange).toHaveBeenLastCalledWith(75);
    fireEvent.changeText(getByTestId('input-planned-duration'), '');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('PLANNED_STATUS_OPTIONS', () => {
  it('liste les 4 statuts dans l’ordre avec libellé et emoji', () => {
    expect(PLANNED_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'pending',
      'confirmed',
      'skipped',
      'cancelled',
    ]);
    PLANNED_STATUS_OPTIONS.forEach((o) => {
      expect(o.label).toBeTruthy();
      expect(o.emoji).toBeTruthy();
    });
  });
});
