import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, iconSizes, radii, spacing, typography } from '@/shared/constants/theme';
import { IconName } from './types';

/** `default` : champ encadré ; `title` : grand titre éditable, simplement souligné. */
export type TextFieldVariant = 'default' | 'title';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Message d'erreur : bordure rouge + texte sous le champ. */
  error?: string | null;
  /** Texte d'aide affiché sous le champ (masqué si `error`). */
  helperText?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onPressRightIcon?: () => void;
  /** Ajoute un bouton œil pour afficher / masquer le mot de passe. */
  isPassword?: boolean;
  /** Affiche un compteur `n/maxLength` (requiert `maxLength`). */
  showCounter?: boolean;
  /** Hauteur minimale en mode `multiline` (zone de texte). Par défaut : 96. */
  minHeight?: number;
  variant?: TextFieldVariant;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onPressRightIcon,
      isPassword = false,
      showCounter = false,
      containerStyle,
      style,
      editable = true,
      value,
      maxLength,
      onFocus,
      onBlur,
      secureTextEntry,
      multiline = false,
      minHeight = 96,
      variant = 'default',
      accessibilityLabel,
      testID,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureVisible, setIsSecureVisible] = useState(false);

    const isTitle = variant === 'title';
    const borderColor = error ? colors.error : isFocused ? colors.primary : colors.border;
    const trailingIcon: IconName | undefined = isPassword
      ? isSecureVisible
        ? 'eye-off-outline'
        : 'eye-outline'
      : rightIcon;
    const handleTrailingPress = isPassword
      ? () => setIsSecureVisible((visible) => !visible)
      : onPressRightIcon;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View
          style={[
            styles.inputWrapper,
            isTitle && styles.inputWrapperTitle,
            { borderColor },
            multiline && styles.inputWrapperMultiline,
            !editable && styles.disabled,
          ]}
          testID={testID ? `${testID}-wrapper` : undefined}
        >
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={iconSizes.md}
              color={colors.textMuted}
              style={styles.leftIcon}
            />
          ) : null}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              isTitle && styles.inputTitle,
              multiline && [styles.inputMultiline, { minHeight }],
              style,
            ]}
            multiline={multiline}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            editable={editable}
            value={value}
            maxLength={maxLength}
            secureTextEntry={isPassword ? !isSecureVisible : secureTextEntry}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: !editable }}
            testID={testID}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            {...props}
          />
          {trailingIcon ? (
            handleTrailingPress ? (
              <TouchableOpacity
                onPress={handleTrailingPress}
                accessibilityRole="button"
                accessibilityLabel={
                  isPassword
                    ? isSecureVisible
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                    : 'Action du champ'
                }
                hitSlop={8}
                testID={testID ? `${testID}-right-icon` : undefined}
              >
                <Ionicons name={trailingIcon} size={iconSizes.md} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name={trailingIcon} size={iconSizes.md} color={colors.textMuted} />
            )
          ) : null}
        </View>
        {error || helperText || (showCounter && maxLength) ? (
          <View style={styles.footer}>
            <Text
              style={[styles.helper, error ? styles.errorText : null]}
              accessibilityLiveRegion="polite"
            >
              {error || helperText || ''}
            </Text>
            {showCounter && maxLength ? (
              <Text style={styles.helper}>{`${value?.length ?? 0}/${maxLength}`}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
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
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.md,
    // Sur le web, un <input> a une largeur intrinsèque : sans minWidth 0 il déborde du conteneur.
    minWidth: 0,
    paddingVertical: spacing.sm + 2,
  },
  inputTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    paddingVertical: spacing.xs,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.md - 2,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  inputWrapperTitle: {
    backgroundColor: colors.transparent,
    borderBottomWidth: 1,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: spacing.xs,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
});
