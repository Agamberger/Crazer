import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';
import { IconName } from './types';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Icône Ionicons à gauche (ignorée si `left` est fourni). */
  icon?: IconName;
  /** Élément personnalisé à gauche (ex : `<Avatar />`). */
  left?: React.ReactNode;
  /** Élément personnalisé à droite (ex : `<Badge />`, `<Button />`). */
  right?: React.ReactNode;
  /** Affiche un chevron « > » (activé par défaut si `onPress` et pas de `right`). */
  showChevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Style « carte » (fond + bordure) au lieu d'une ligne nue. */
  bordered?: boolean;
  /** Variante destructive : titre en rouge (ex : « Se déconnecter »). */
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const ListItemComponent: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  left,
  right,
  showChevron,
  onPress,
  onLongPress,
  disabled = false,
  bordered = false,
  destructive = false,
  style,
  accessibilityLabel,
  testID,
}) => {
  const interactive = Boolean(onPress || onLongPress);
  const chevron = showChevron ?? (interactive && !right);
  const titleColor = destructive ? colors.error : colors.textPrimary;

  const leading =
    left ??
    (icon ? (
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={iconSizes.md}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
    ) : null);

  const main = (
    <>
      {leading ? <View style={styles.left}>{leading}</View> : null}
      <View style={styles.texts}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {chevron ? (
        <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.textMuted} />
      ) : null}
    </>
  );

  // L'élément de droite (souvent un bouton) reste en dehors de la zone cliquable :
  // un bouton imbriqué dans un autre est inaccessible aux lecteurs d'écran.
  const trailing = right ? <View style={styles.right}>{right}</View> : null;
  const containerStyle = [
    styles.container,
    bordered && styles.bordered,
    disabled && styles.disabled,
    style,
  ];

  if (!interactive) {
    return (
      <View style={containerStyle} testID={testID}>
        {main}
        {trailing}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <TouchableOpacity
        style={styles.pressable}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {main}
      </TouchableOpacity>
      {trailing}
    </View>
  );
};

/** Ligne de liste générique (paramètres, amis, lieux…). Mémoïsée pour les FlatList. */
export const ListItem = React.memo(ListItemComponent);
ListItem.displayName = 'ListItem';

const styles = StyleSheet.create({
  bordered: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm + 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  left: {
    marginRight: spacing.sm + 4,
  },
  pressable: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    flexDirection: 'row',
  },
  right: {
    marginLeft: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
});
