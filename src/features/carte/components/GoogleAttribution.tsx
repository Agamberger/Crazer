import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface GoogleAttributionProps {
  /** Link to the place on Google Maps; shows « Voir sur Google Maps » when given. */
  googleMapsUri?: string;
  /** The block also shows Crazer community data: « Google Maps · Crazer ». */
  withCrazer?: boolean;
  testID?: string;
}

/**
 * « Google Maps » credit required by Google Maps Platform wherever Google content is shown
 * outside a Google map, with an optional link to the place on Google Maps.
 */
export const GoogleAttribution: React.FC<GoogleAttributionProps> = ({
  googleMapsUri,
  withCrazer = false,
  testID = 'google-attribution',
}) => (
  <View style={styles.container} testID={testID}>
    <AppText variant="caption" color="muted" style={styles.label} testID={`${testID}-sources`}>
      {withCrazer ? 'Google Maps · Crazer' : 'Google Maps'}
    </AppText>
    {googleMapsUri ? (
      <Button
        title="Voir sur Google Maps"
        variant="ghost"
        size="sm"
        rightIcon="open-outline"
        onPress={() => void Linking.openURL(googleMapsUri)}
        accessibilityLabel="Ouvrir ce lieu dans Google Maps"
        testID={`${testID}-link`}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
  },
});
