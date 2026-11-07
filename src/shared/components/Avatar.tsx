import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '@/shared/constants/theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Nom complet, utilisé pour les initiales et l'accessibilité. */
  name?: string | null;
  /** Fallback pour les initiales si `name` est vide (ex : email). */
  fallback?: string;
  imageUrl?: string | null;
  size?: AvatarSize;
  /** Affiche une pastille verte « en ligne ». */
  online?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 88,
};

export const getInitials = (name?: string | null, fallback?: string): string => {
  const source = name?.trim() || fallback?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  fallback,
  imageUrl,
  size = 'md',
  online = false,
  style,
  testID,
}) => {
  // On mémorise l'URL qui a échoué (et non un simple booléen) pour réessayer
  // automatiquement lorsqu'une nouvelle URL est fournie.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageFailed = Boolean(imageUrl) && failedUrl === imageUrl;
  const dimension = AVATAR_SIZES[size];
  const showImage = Boolean(imageUrl) && !imageFailed;
  const circle = { borderRadius: dimension / 2, height: dimension, width: dimension };

  return (
    <View
      style={[styles.container, circle, style]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}
      testID={testID}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl as string }}
          style={[styles.image, circle]}
          onError={() => setFailedUrl(imageUrl ?? null)}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(10, dimension * 0.38) }]}>
          {getInitials(name, fallback)}
        </Text>
      )}
      {online ? (
        <View
          style={[
            styles.onlineDot,
            { borderRadius: dimension * 0.14, height: dimension * 0.28, width: dimension * 0.28 },
          ]}
          testID={testID ? `${testID}-online` : 'avatar-online'}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderColor: colors.background,
    borderWidth: 2,
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
});
