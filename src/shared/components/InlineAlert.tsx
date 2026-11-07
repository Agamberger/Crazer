import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, radii, spacing, typography } from '@/shared/constants/theme';
import { IconName } from './types';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

export interface InlineAlertProps {
  message: string;
  title?: string;
  tone?: AlertTone;
  /** Si fourni, affiche une croix pour fermer l'alerte. */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ALERT_TONES: Record<AlertTone, { color: string; bg: string; icon: IconName }> = {
  error: { color: colors.error, bg: colors.errorBackground, icon: 'alert-circle' },
  success: { color: colors.success, bg: colors.successBackground, icon: 'checkmark-circle' },
  warning: { color: colors.warning, bg: colors.warningBackground, icon: 'warning' },
  info: { color: colors.primary, bg: colors.infoBackground, icon: 'information-circle' },
};

/** Bandeau de message contextuel (erreur de formulaire, succès, info…). */
export const InlineAlert: React.FC<InlineAlertProps> = ({
  message,
  title,
  tone = 'error',
  onDismiss,
  style,
  testID,
}) => {
  const { color, bg, icon } = ALERT_TONES[tone];

  return (
    <View
      style={[styles.container, { backgroundColor: bg, borderColor: color }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={icon} size={iconSizes.md} color={color} />
      <View style={styles.texts}>
        {title ? <Text style={[styles.title, { color }]}>{title}</Text> : null}
        <Text style={[styles.message, { color: title ? colors.textSecondary : color }]}>
          {message}
        </Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer le message"
          testID={testID ? `${testID}-dismiss` : 'inline-alert-dismiss'}
        >
          <Ionicons name="close" size={iconSizes.md} color={color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.sm + 2,
  },
  message: {
    fontSize: typography.fontSizes.sm,
  },
  texts: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 2,
  },
});
