import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, SectionHeader } from '@/shared/components';
import { IconName } from '@/shared/components/types';
import { colors, iconSizes, radii, spacing } from '@/shared/constants/theme';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}

export interface QuickActionsProps {
  actions: QuickAction[];
}

/** Raccourcis de l'accueil (organiser une sortie, explorer la carte, trouver des amis…). */
export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => (
  <View testID="home-quick-actions">
    <SectionHeader title="Raccourcis" />
    {actions.map((action) => (
      <Card
        key={action.id}
        onPress={action.onPress}
        disabled={action.disabled}
        style={styles.card}
        accessibilityLabel={`${action.label}. ${action.description}`}
        testID={`home-action-${action.id}`}
      >
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name={action.icon} size={iconSizes.md} color={colors.primary} />
          </View>
          <View style={styles.texts}>
            <AppText weight="semibold">{action.label}</AppText>
            <AppText variant="caption" color="secondary">
              {action.description}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.textMuted} />
        </View>
      </Card>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.md,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  texts: {
    flex: 1,
  },
});
