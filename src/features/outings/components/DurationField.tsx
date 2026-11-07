import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, ChipGroup, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DURATION_PRESETS } from '../constants';

export interface DurationFieldProps {
  /** Durée en minutes, `null` si non renseignée. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  label?: string;
}

const CUSTOM_INPUT_WIDTH = 140;

const parseMinutes = (text: string): number | null => {
  const numeric = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(numeric) ? null : numeric;
};

/** Sélection de la durée d'une étape : presets rapides + saisie libre en minutes. */
export const DurationField: React.FC<DurationFieldProps> = ({
  value,
  onChange,
  label = 'Durée estimée',
}) => (
  <View style={styles.container}>
    <ChipGroup
      label={label}
      options={DURATION_PRESETS}
      value={value}
      onChange={onChange}
      style={styles.presets}
      testID="chip-duration"
    />
    <View style={styles.customRow}>
      <TextField
        placeholder="Personnalisé (min)"
        keyboardType="numeric"
        value={value !== null ? value.toString() : ''}
        onChangeText={(text) => onChange(parseMinutes(text))}
        containerStyle={styles.customInput}
        accessibilityLabel="Durée personnalisée en minutes"
        testID="input-planned-duration"
      />
      <AppText variant="bodySmall" color="muted">
        minutes
      </AppText>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  customInput: {
    marginBottom: 0,
    width: CUSTOM_INPUT_WIDTH,
  },
  customRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presets: {
    marginBottom: spacing.sm,
  },
});
