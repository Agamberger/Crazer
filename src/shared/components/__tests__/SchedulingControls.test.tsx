import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  MultiChipGroup,
  MultiDateCalendar,
  TimeRangeField,
  formatTimeLabel,
  isValidTimeRange,
  toggleChipValue,
} from '@/shared/components';

const DAYS = [
  { value: 'mon', label: 'Lundi' },
  { value: 'tue', label: 'Mardi' },
  { value: 'wed', label: 'Mercredi' },
] as const;

describe('MultiChipGroup', () => {
  it('marque toutes les valeurs sélectionnées', () => {
    const { getByTestId } = render(
      <MultiChipGroup options={DAYS} values={['mon', 'wed']} onChange={jest.fn()} testID="days" />,
    );
    expect(getByTestId('days-mon').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByTestId('days-tue').props.accessibilityState).toMatchObject({ selected: false });
    expect(getByTestId('days-wed').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('ajoute une valeur en respectant l’ordre des options', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <MultiChipGroup options={DAYS} values={['wed']} onChange={onChange} testID="days" />,
    );
    fireEvent.press(getByTestId('days-mon'));
    expect(onChange).toHaveBeenCalledWith(['mon', 'wed']);
  });

  it('retire une valeur déjà sélectionnée', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <MultiChipGroup options={DAYS} values={['mon', 'tue']} onChange={onChange} testID="days" />,
    );
    fireEvent.press(getByTestId('days-mon'));
    expect(onChange).toHaveBeenCalledWith(['tue']);
  });

  it('toggleChipValue fonctionne aussi avec des nombres', () => {
    const options = [
      { value: 1, label: 'Un' },
      { value: 2, label: 'Deux' },
    ];
    expect(toggleChipValue(options, [2], 1)).toEqual([1, 2]);
    expect(toggleChipValue(options, [1, 2], 2)).toEqual([1]);
  });
});

describe('TimeRangeField', () => {
  it('affiche les heures formatées', () => {
    const { getByText } = render(
      <TimeRangeField label="Lundi" value={{ start: '12:00', end: '21:30' }} onChange={jest.fn()} />,
    );
    expect(getByText('Lundi')).toBeTruthy();
    expect(getByText('12h')).toBeTruthy();
    expect(getByText('21h30')).toBeTruthy();
  });

  it('signale un créneau invalide', () => {
    const { getByTestId } = render(
      <TimeRangeField value={{ start: '22:00', end: '19:00' }} onChange={jest.fn()} testID="slot" />,
    );
    expect(getByTestId('slot-error')).toBeTruthy();
  });

  it('met à jour la borne choisie depuis le sélecteur', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <TimeRangeField value={{ start: '18:00', end: '23:00' }} onChange={onChange} testID="slot" />,
    );
    expect(queryByTestId('slot-error')).toBeNull();
    fireEvent.press(getByTestId('slot-start'));
    fireEvent.press(getByTestId('btn-picker-confirm'));
    expect(onChange).toHaveBeenCalledWith({ start: '18:00', end: '23:00' });
  });

  it('helpers : validation et libellés', () => {
    expect(isValidTimeRange({ start: '09:00', end: '10:00' })).toBe(true);
    expect(isValidTimeRange({ start: '10:00', end: '10:00' })).toBe(false);
    expect(formatTimeLabel('09:05')).toBe('9h05');
    expect(formatTimeLabel('18:00')).toBe('18h');
  });
});

describe('MultiDateCalendar', () => {
  // 10 Nov 2026: past days of November are disabled, months can be navigated freely forward.
  const MIN = new Date(2026, 10, 10);

  it('sélectionne plusieurs jours et les liste en puces', () => {
    const onChange = jest.fn();
    const { getByTestId, rerender } = render(
      <MultiDateCalendar values={[]} onChange={onChange} minDate={MIN} testID="cal" />,
    );
    fireEvent.press(getByTestId('day-cell-12'));
    expect(onChange).toHaveBeenLastCalledWith(['2026-11-12']);

    rerender(
      <MultiDateCalendar values={['2026-11-12']} onChange={onChange} minDate={MIN} testID="cal" />,
    );
    expect(getByTestId('day-cell-12').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByTestId('cal-selected-2026-11-12')).toBeTruthy();

    fireEvent.press(getByTestId('day-cell-12'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('désactive les jours passés et le mois précédent', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <MultiDateCalendar values={[]} onChange={onChange} minDate={MIN} />,
    );
    expect(getByTestId('day-cell-9').props.accessibilityState).toMatchObject({ disabled: true });
    expect(getByTestId('day-cell-10').props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(getByTestId('day-cell-9'));
    expect(onChange).not.toHaveBeenCalled();
    expect(getByTestId('btn-prev-month').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('permet de choisir des jours dans les mois suivants, au-delà de l’année', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <MultiDateCalendar values={['2026-11-12']} onChange={onChange} minDate={MIN} />,
    );
    fireEvent.press(getByTestId('btn-next-month'));
    fireEvent.press(getByTestId('btn-next-month'));
    expect(getByTestId('month-title').props.children.join('')).toBe('Janvier 2027');
    fireEvent.press(getByTestId('day-cell-2'));
    expect(onChange).toHaveBeenLastCalledWith(['2026-11-12', '2027-01-02']);
  });

  it('retire un jour depuis sa puce', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <MultiDateCalendar values={['2026-11-12', '2026-12-01']} onChange={onChange} minDate={MIN} />,
    );
    fireEvent.press(getByLabelText(/Retirer.*1 déc/));
    expect(onChange).toHaveBeenLastCalledWith(['2026-11-12']);
  });
});
