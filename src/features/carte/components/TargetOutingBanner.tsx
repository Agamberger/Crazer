import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, IconButton } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';

export interface TargetOutingBannerProps {
  /** Title of the outing that places are being added to. */
  outingTitle: string;
  /** Leaves the "add to this outing" mode. */
  onClear: () => void;
}

/** Map banner shown while places are being added to a specific outing. */
export const TargetOutingBanner: React.FC<TargetOutingBannerProps> = ({ outingTitle, onClear }) => (
  <View style={styles.targetBanner} testID="target-outing-banner">
    <View style={styles.targetBannerContent}>
      <AppText variant="caption" color="accent" weight="bold">
        🎯 Ajout à la sortie
      </AppText>
      <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
        {outingTitle}
      </AppText>
    </View>
    <IconButton
      icon="close"
      size="sm"
      color={colors.textPrimary}
      onPress={onClear}
      accessibilityLabel="Quitter le mode ajout"
      testID="btn-clear-target-outing"
    />
  </View>
);

const styles = StyleSheet.create({
  targetBanner: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1.5,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  targetBannerContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
});
