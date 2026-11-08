import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingType } from '@/shared/types';
import { OUTING_TYPE_OPTIONS } from '../../questionOptions';

export interface OutingTypeStepProps {
  /** Currently chosen type (highlighted), `null` when none. */
  selected?: OutingType | null;
  onSelect: (type: OutingType) => void;
  disabled?: boolean;
}

/** « Quel genre de sortie ? » — the organizer picks the outing type. */
export const OutingTypeStep: React.FC<OutingTypeStepProps> = ({
  selected = null,
  onSelect,
  disabled = false,
}) => (
  <>
    <AppText variant="h2">Quel genre de sortie ?</AppText>
    <AppText color="secondary">Les questions suivantes dépendent du type choisi.</AppText>
    <View accessibilityRole="radiogroup" style={styles.options}>
      {OUTING_TYPE_OPTIONS.map((option) => (
        <Card
          key={option.value}
          variant={option.value === selected ? 'elevated' : 'outlined'}
          disabled={disabled}
          onPress={() => onSelect(option.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.value === selected }}
          accessibilityLabel={`${option.label} : ${option.description}`}
          testID={`outing-type-${option.value}`}
        >
          <AppText variant="h3">
            {option.emoji} {option.label}
            {option.value === selected ? ' ✓' : ''}
          </AppText>
          <AppText color="secondary">{option.description}</AppText>
        </Card>
      ))}
    </View>
  </>
);

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  },
});
