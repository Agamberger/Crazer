import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors, iconSizes } from '@/shared/constants/theme';
import { IconName } from './types';

export interface TextFieldTrailingIconProps {
  /** Icon shown on the right (ignored when `isPassword`: the eye icon is used instead). */
  icon?: IconName;
  onPress?: () => void;
  /** Turns the icon into a show / hide password toggle. */
  isPassword: boolean;
  isSecureVisible: boolean;
  onToggleSecure: () => void;
  /** testID of the parent `TextField` (the button gets `${testID}-right-icon`). */
  testID?: string;
}

/** Right icon of `TextField`: password eye toggle, pressable action or plain icon. */
export const TextFieldTrailingIcon: React.FC<TextFieldTrailingIconProps> = ({
  icon,
  onPress,
  isPassword,
  isSecureVisible,
  onToggleSecure,
  testID,
}) => {
  const trailingIcon: IconName | undefined = isPassword
    ? isSecureVisible
      ? 'eye-off-outline'
      : 'eye-outline'
    : icon;
  const handlePress = isPassword ? onToggleSecure : onPress;

  if (!trailingIcon) return null;

  if (!handlePress) {
    return <Ionicons name={trailingIcon} size={iconSizes.md} color={colors.textMuted} />;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
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
  );
};
