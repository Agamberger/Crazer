import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface TextFieldFooterProps {
  error?: string | null;
  helperText?: string;
  /** Shows `length/maxLength` on the right (requires `maxLength`). */
  showCounter: boolean;
  maxLength?: number;
  length: number;
}

/** Line under a `TextField`: error or helper text, and the optional character counter. */
export const TextFieldFooter: React.FC<TextFieldFooterProps> = ({
  error,
  helperText,
  showCounter,
  maxLength,
  length,
}) => {
  const hasCounter = Boolean(showCounter && maxLength);
  if (!error && !helperText && !hasCounter) return null;

  return (
    <View style={styles.footer}>
      <Text
        style={[styles.helper, error ? styles.errorText : null]}
        accessibilityLiveRegion="polite"
      >
        {error || helperText || ''}
      </Text>
      {hasCounter ? <Text style={styles.helper}>{`${length}/${maxLength}`}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  errorText: {
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  helper: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.fontSizes.xs,
  },
});
