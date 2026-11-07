import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, iconSizes, opacity, radii, spacing } from '@/shared/constants/theme';

export interface PlaceOpeningHoursProps {
  hours: string[];
  /** Horaires dépliés (contrôlé par le parent). */
  expanded: boolean;
  onToggle: () => void;
}

/** Bloc repliable des horaires d'ouverture d'un lieu. */
export const PlaceOpeningHours: React.FC<PlaceOpeningHoursProps> = ({
  hours,
  expanded,
  onToggle,
}) => (
  <View style={styles.container} testID="opening-hours-section">
    <TouchableOpacity
      style={styles.header}
      onPress={onToggle}
      activeOpacity={opacity.pressed}
      accessibilityLabel="Afficher ou masquer les horaires d'ouverture"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <AppText variant="caption" weight="semibold">
        🕒 Horaires d&apos;ouverture
      </AppText>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={iconSizes.sm}
        color={colors.textMuted}
      />
    </TouchableOpacity>

    {expanded ? (
      <View style={styles.list} testID="opening-hours-list">
        {hours.map((dayText, idx) => (
          <AppText key={`${dayText}-${idx}`} variant="caption" color="secondary" style={styles.day}>
            {dayText}
          </AppText>
        ))}
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  day: {
    lineHeight: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  list: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
});
