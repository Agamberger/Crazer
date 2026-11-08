import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { PlaceItem } from '../types/carte';
import { buildPlannedStepValues, PlannedStepForm, PlannedStepValues } from './PlannedStepForm';

export interface PlannedStepEditStepProps {
  outing: OutingRow;
  place: PlaceItem;
  /** Back to the outing picker. */
  onChangeOuting: () => void;
  onSubmit: (values: PlannedStepValues) => void;
  isSubmitting: boolean;
  error: string | null;
}

/** Second step of `AddPlaceToOutingModal`: reminder of the chosen outing and the step form. */
export const PlannedStepEditStep: React.FC<PlannedStepEditStepProps> = ({
  outing,
  place,
  onChangeOuting,
  onSubmit,
  isSubmitting,
  error,
}) => (
  <ScrollView
    style={styles.step}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
    testID="step-edit-planned"
  >
    <View style={styles.parentOuting}>
      <View style={styles.parentOutingText}>
        <AppText variant="caption" color="muted">
          Pour la sortie :
        </AppText>
        <AppText variant="bodySmall" color="accent" weight="bold" numberOfLines={1}>
          {outing.title}
        </AppText>
      </View>
      <Button
        title="Changer"
        variant="ghost"
        size="sm"
        leftIcon="arrow-back"
        onPress={onChangeOuting}
        accessibilityLabel="Changer de sortie"
        testID="btn-back-to-outings-list"
      />
    </View>

    <PlannedStepForm
      key={outing.id}
      initialValues={buildPlannedStepValues(outing, place)}
      onSubmit={onSubmit}
      onCancel={onChangeOuting}
      isSubmitting={isSubmitting}
      error={error}
    />
  </ScrollView>
);

const styles = StyleSheet.create({
  parentOuting: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.md - 2,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  parentOutingText: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  step: {
    flex: 1,
  },
});
