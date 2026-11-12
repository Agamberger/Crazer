import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/components';
import { colors, iconSizes, spacing, typography } from '@/shared/constants/theme';

export interface HubSectionRowProps {
  emoji: string;
  title: string;
  /** Short, visual summary of the section content. */
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/** One row of the outing hub: emoji, title, summary and a chevron; opens the section panel. */
export const HubSectionRow: React.FC<HubSectionRowProps> = ({
  emoji,
  title,
  children,
  onPress,
  accessibilityLabel,
  testID,
}) => (
  <Card
    variant="outlined"
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    style={styles.card}
    testID={testID}
  >
    <AppText style={styles.emoji} accessible={false}>
      {emoji}
    </AppText>
    <View style={styles.body}>
      <AppText variant="h3">{title}</AppText>
      <View style={styles.summary}>{children}</View>
    </View>
    <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.textMuted} />
  </Card>
);

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  emoji: {
    fontSize: typography.fontSizes.xxl,
  },
  summary: {
    gap: spacing.xs,
  },
});
