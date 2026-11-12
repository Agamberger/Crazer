import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Chip, ListItem, SearchBar } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useActivityPlaceSearch } from '../../hooks/useActivityPlaceSearch';
import { ActivityPlaceSource, PickedPlace } from '../../types/activityPlaces';

export interface ActivityPlacePickerProps {
  userId: string | null;
  value: PickedPlace | null;
  onChange: (place: PickedPlace | null) => void;
}

const SOURCE_LABELS: Record<ActivityPlaceSource, string> = {
  crazer: 'Crazer',
  google: 'Google Maps',
};

/** Links an activity to a place found among the saved Crazer places or on Google Maps. */
export const ActivityPlacePicker: React.FC<ActivityPlacePickerProps> = ({ userId, value, onChange }) => {
  const search = useActivityPlaceSearch(userId, onChange);

  if (value) {
    return (
      <View style={styles.container}>
        <AppText variant="label">Lieu</AppText>
        <Chip
          label={value.name}
          emoji="📍"
          onRemove={() => onChange(null)}
          accessibilityLabel={`Lieu : ${value.name}. Retirer`}
          testID="activity-place-chip"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText variant="label">Lieu (facultatif)</AppText>
      <SearchBar
        value={search.query}
        onChangeText={search.setQuery}
        loading={search.isSearching || search.isResolving}
        placeholder="Chercher sur Crazer ou Google Maps..."
        accessibilityLabel="Chercher un lieu"
        testID="input-activity-place"
      />
      {search.suggestions.map((suggestion) => (
        <ListItem
          key={`${suggestion.source}-${suggestion.key}`}
          title={suggestion.name}
          subtitle={[SOURCE_LABELS[suggestion.source], suggestion.subtitle].filter(Boolean).join(' · ')}
          left={<AppText>📍</AppText>}
          showChevron={false}
          bordered
          disabled={search.isResolving}
          onPress={() => search.select(suggestion)}
          accessibilityLabel={`Choisir ${suggestion.name} (${SOURCE_LABELS[suggestion.source]})`}
          testID={`place-suggestion-${suggestion.source}-${suggestion.key}`}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
