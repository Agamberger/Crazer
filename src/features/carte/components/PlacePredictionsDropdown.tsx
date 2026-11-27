import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, ListItem } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { GooglePlacePrediction } from '../services/googlePlaces';
import { GoogleAttribution } from './GoogleAttribution';

export interface PlacePredictionsDropdownProps {
  predictions: GooglePlacePrediction[];
  onSelectPrediction: (prediction: GooglePlacePrediction) => void;
}

/** Google Places autocomplete suggestions shown under the map search bar. */
export const PlacePredictionsDropdown: React.FC<PlacePredictionsDropdownProps> = ({
  predictions,
  onSelectPrediction,
}) => {
  if (predictions.length === 0) return null;

  return (
    <View style={styles.dropdownContainer} testID="autocomplete-dropdown">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        style={styles.dropdownScroll}
      >
        {predictions.map((item) => {
          const mainText = item.mainText;
          return (
            <ListItem
              key={item.placeId}
              title={mainText}
              subtitle={item.secondaryText}
              left={<AppText>📍</AppText>}
              showChevron={false}
              onPress={() => onSelectPrediction(item)}
              accessibilityLabel={`Sélectionner ${mainText}`}
              style={styles.dropdownItem}
            />
          );
        })}
      </ScrollView>
      <View style={styles.attribution}>
        <GoogleAttribution testID="predictions-google-attribution" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  attribution: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md + 2,
    borderWidth: 1,
    elevation: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    maxHeight: 260,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 20,
  },
  dropdownItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 0,
    paddingHorizontal: spacing.md,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
});
