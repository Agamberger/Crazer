import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface PlaceDetailActionsProps {
  /** A specific outing is targeted from the map: the add button names "la sortie". */
  isTargetMode: boolean;
  onGetDirections: () => void;
  onAddToOuting: () => void;
}

/** "Itinéraire" and "Ajouter à une sortie" buttons at the bottom of `PlaceDetailCard`. */
export const PlaceDetailActions: React.FC<PlaceDetailActionsProps> = ({
  isTargetMode,
  onGetDirections,
  onAddToOuting,
}) => (
  <View style={styles.actionsRow}>
    <Button
      title="🗺️ Itinéraire"
      variant="outline"
      size="sm"
      onPress={onGetDirections}
      accessibilityLabel="Lancer l'itinéraire"
      style={styles.actionButton}
    />
    <Button
      title={isTargetMode ? '+ Ajouter à la sortie' : '+ Ajouter à une sortie'}
      size="sm"
      onPress={onAddToOuting}
      accessibilityLabel={
        isTargetMode ? 'Ajouter ce lieu à la sortie' : 'Ajouter ce lieu à une sortie'
      }
      style={styles.actionButton}
      testID="add-to-outing-button"
    />
  </View>
);

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
});
