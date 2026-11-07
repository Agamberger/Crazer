import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface HomeHeaderProps {
  greeting: string;
  firstName: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

/** En-tête de l'accueil : salutation personnalisée et avatar. */
export const HomeHeader: React.FC<HomeHeaderProps> = ({
  greeting,
  firstName,
  fullName,
  avatarUrl,
}) => (
  <View style={styles.container} testID="home-header">
    <View style={styles.texts}>
      <AppText variant="h2" weight="bold" accessibilityRole="header">
        {firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`}
      </AppText>
      <AppText color="secondary">Qu&apos;est-ce qu&apos;on fait aujourd&apos;hui ?</AppText>
    </View>
    <Avatar name={fullName ?? firstName} imageUrl={avatarUrl} size="lg" testID="home-avatar" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  texts: {
    flex: 1,
    marginRight: spacing.md,
  },
});
