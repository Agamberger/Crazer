import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { IconButton } from './IconButton';
import { IconName } from './types';

export interface AppModalHeaderProps {
  title?: string;
  /** Full screen: close button on the left (like a navigation bar) and centred title. */
  isFullScreen: boolean;
  onClose: () => void;
  closeIcon: IconName;
  closeAccessibilityLabel: string;
  closeButtonTestID: string;
}

/**
 * Title bar of `AppModal`. Rendered when there is a title, and always in full screen, where the
 * close button is the only way back.
 */
export const AppModalHeader: React.FC<AppModalHeaderProps> = ({
  title,
  isFullScreen,
  onClose,
  closeIcon,
  closeAccessibilityLabel,
  closeButtonTestID,
}) => {
  if (!isFullScreen && !title) return null;

  const closeButton = (
    <IconButton
      icon={closeIcon}
      size="sm"
      variant={isFullScreen ? 'ghost' : 'surface'}
      accessibilityLabel={closeAccessibilityLabel}
      onPress={onClose}
      testID={closeButtonTestID}
    />
  );

  return (
    <View style={styles.header}>
      {isFullScreen ? closeButton : null}
      <Text
        style={[styles.title, isFullScreen && styles.titleFullScreen]}
        accessibilityRole="header"
        numberOfLines={2}
      >
        {title ?? ''}
      </Text>
      {isFullScreen ? <View style={styles.headerSpacer} /> : closeButton}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.sm,
  },
  titleFullScreen: {
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
});
