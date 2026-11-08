import React from 'react';
import { ChipGroup } from '@/shared/components';
import { YES_NO_OPTIONS } from '../../questionOptions';

type YesNo = 'yes' | 'no';

export interface YesNoChipGroupProps {
  label: string;
  /** `null` = not answered. */
  value: boolean | null;
  /** Receives `null` when the selected answer is pressed again (clears it). */
  onChange: (value: boolean | null) => void;
  testID: string;
}

const toYesNo = (value: boolean | null): YesNo | null => {
  if (value === null) return null;
  return value ? 'yes' : 'no';
};

/** « Oui / Non » question whose answer can be cleared by pressing it again. */
export const YesNoChipGroup: React.FC<YesNoChipGroupProps> = ({ label, value, onChange, testID }) => (
  <ChipGroup<YesNo>
    label={label}
    options={YES_NO_OPTIONS}
    value={toYesNo(value)}
    onChange={(selected) => onChange(selected === toYesNo(value) ? null : selected === 'yes')}
    testID={testID}
  />
);
