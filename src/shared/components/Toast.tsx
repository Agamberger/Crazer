import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, iconSizes, radii, spacing, typography } from '@/shared/constants/theme';
import { useToastStore } from '@/shared/store/useToastStore';
import { ALERT_TONES } from './InlineAlert';

const ENTER_DURATION = 200;
const ENTER_OFFSET = -16;

/**
 * Affiche les toasts de `useToastStore` (un à la fois, en haut de l'écran).
 * À monter **une seule fois**, à la racine de l'app (`app/_layout.tsx`).
 * Déclencher un toast depuis n'importe où : `toast.success('Sortie créée')`.
 */
export const ToastHost: React.FC = () => {
  const current = useToastStore((state) => state.queue[0]);
  const hide = useToastStore((state) => state.hide);
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  const currentId = current?.id;
  const duration = current?.duration;

  useEffect(() => {
    if (!currentId || duration === undefined) return undefined;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_DURATION,
      useNativeDriver: true,
    });
    animation.start();

    const timer = setTimeout(() => hide(currentId), duration);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [currentId, duration, hide, progress]);

  if (!current) return null;

  const { color, icon } = ALERT_TONES[current.tone];
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET, 0] });

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Animated.View style={[styles.animated, { opacity: progress, transform: [{ translateY }] }]}>
        <Pressable
          onPress={() => hide(current.id)}
          style={[styles.toast, { borderLeftColor: color }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Touchez pour fermer"
          testID="toast"
        >
          <Ionicons name={icon} size={iconSizes.md} color={color} />
          <View style={styles.texts}>
            {current.title ? <Text style={styles.title}>{current.title}</Text> : null}
            <Text style={styles.message} numberOfLines={3}>
              {current.message}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  animated: {
    width: '100%',
  },
  host: {
    alignItems: 'center',
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 1000,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  texts: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 2,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    padding: spacing.md - 4,
    shadowColor: colors.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
