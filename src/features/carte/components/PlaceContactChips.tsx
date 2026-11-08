import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Chip } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface PlaceContactChipsProps {
  phone?: string;
  website?: string;
}

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

/** "Call" and "website" shortcuts of a place. Renders nothing without phone nor website. */
export const PlaceContactChips: React.FC<PlaceContactChipsProps> = ({ phone, website }) => {
  if (!phone && !website) return null;

  return (
    <View style={styles.contactRow} testID="contact-buttons-row">
      {phone ? (
        <Chip
          label={phone}
          emoji="📞"
          onPress={() => openUrl(`tel:${phone}`)}
          accessibilityLabel="Appeler l'établissement"
        />
      ) : null}
      {website ? (
        <Chip
          label="Site Web"
          emoji="🌐"
          onPress={() => openUrl(website)}
          accessibilityLabel="Visiter le site internet"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
});
