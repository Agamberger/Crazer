import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppModal,
  AppText,
  Badge,
  Button,
  EmptyState,
  ListItem,
  Loader,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { PlannedOutingRow } from '@/shared/types';
import { TimelineStep } from './TimelineStep';

export interface PlannedOutingsTimelineProps {
  plannedOutings: PlannedOutingRow[];
  isLoading?: boolean;
  onSelectPlannedOuting?: (plannedOuting: PlannedOutingRow) => void;
  onAddPlannedOuting?: () => void;
  onAddFromMap?: () => void;
  canEdit?: boolean;
  isAdding?: boolean;
}

export const PlannedOutingsTimeline: React.FC<PlannedOutingsTimelineProps> = ({
  plannedOutings,
  isLoading = false,
  onSelectPlannedOuting,
  onAddPlannedOuting,
  onAddFromMap,
  canEdit = true,
}) => {
  const [isChoiceModalVisible, setIsChoiceModalVisible] = useState(false);

  // Tri chronologique par date planifiée
  const sortedOutings = [...plannedOutings].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
  );

  const canAdd = canEdit && Boolean(onAddPlannedOuting || onAddFromMap);
  const canSelect = canEdit && Boolean(onSelectPlannedOuting);

  const closeChoice = () => setIsChoiceModalVisible(false);
  const handleSelectCustom = () => {
    closeChoice();
    onAddPlannedOuting?.();
  };
  const handleSelectMap = () => {
    closeChoice();
    onAddFromMap?.();
  };

  const renderBody = () => {
    if (isLoading && sortedOutings.length === 0) {
      return <Loader size="small" message="Chargement des étapes..." />;
    }
    if (sortedOutings.length === 0) {
      return (
        <EmptyState
          icon="location-outline"
          title="Aucune étape planifiée"
          description="Ajoutez des étapes pour construire l'itinéraire et le programme de la sortie !"
          testID="planned-outings-empty"
        />
      );
    }
    return (
      <View style={styles.timelineList}>
        {sortedOutings.map((item, index) => (
          <TimelineStep
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === sortedOutings.length - 1}
            onPress={canSelect ? () => onSelectPlannedOuting?.(item) : undefined}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container} testID="planned-outings-timeline">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <AppText weight="bold">
            Étapes de la sortie
          </AppText>
          <Badge label={String(sortedOutings.length)} tone="neutral" />
        </View>
        {canAdd ? (
          <Button
            title="Ajouter"
            variant="outline"
            size="sm"
            leftIcon="add"
            onPress={() => setIsChoiceModalVisible(true)}
            accessibilityLabel="Ajouter une étape"
            testID="btn-add-planned-outing"
          />
        ) : null}
      </View>

      {renderBody()}

      <AppModal
        visible={isChoiceModalVisible}
        onClose={closeChoice}
        variant="sheet"
        title="Ajouter une étape"
        closeButtonTestID="btn-close-add-choice"
        testID="modal-add-step-choice"
      >
        <ListItem
          bordered
          icon="create-outline"
          title="Étape personnalisée"
          subtitle="Créer manuellement un point de rendez-vous ou une étape libre"
          onPress={handleSelectCustom}
          accessibilityLabel="Créer une étape personnalisée"
          testID="btn-add-custom-step"
        />
        <ListItem
          bordered
          icon="map-outline"
          title="Choisir un lieu sur la carte"
          subtitle="Explorer la carte et sélectionner un bar, restaurant ou activité"
          onPress={handleSelectMap}
          accessibilityLabel="Choisir un lieu sur la carte"
          testID="btn-add-from-map"
        />
        <Button
          title="Annuler"
          variant="ghost"
          onPress={closeChoice}
          style={styles.cancelButton}
          testID="btn-cancel-add-choice"
        />
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  cancelButton: {
    marginTop: spacing.xs,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  timelineList: {
    marginTop: spacing.xs,
  },
});
