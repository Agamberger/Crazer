import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, ListItem } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { GoogleAutocompletePrediction } from '../services/googlePlacesService';

export interface PlacePredictionsDropdownProps {
  predictions: GoogleAutocompletePrediction[];
  onSelectPrediction: (prediction: GoogleAutocompletePrediction) => void;
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
          const mainText = item.structured_formatting?.main_text || item.description;
          return (
            <ListItem
              key={item.place_id}
              title={mainText}
              subtitle={item.structured_formatting?.secondary_text || undefined}
              left={<AppText>📍</AppText>}
              showChevron={false}
              onPress={() => onSelectPrediction(item)}
              accessibilityLabel={`Sélectionner ${mainText}`}
              style={styles.dropdownItem}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md + 2,
    borderWidth: 1,
    elevation: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    maxHeight: 220,
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
