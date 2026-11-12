import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, IconButton, InlineAlert } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { formatDuration } from '../PlannedOutingCard';
import { MoveDirection, PlanningStepView, StepAttendance } from '../../types/planning';
import { describeAttendanceDetail, StepAttendanceList } from './StepAttendanceList';

export interface PlanningStepCardProps {
  view: PlanningStepView;
  isFirst: boolean;
  isLast: boolean;
  /** Organizer: shows the reorder and duration actions. */
  canEdit: boolean;
  isSaving: boolean;
  onMove: (stepId: string, direction: MoveDirection) => void;
  onEditDuration: (view: PlanningStepView) => void;
}

/** Warning listing who does not attend the whole step. */
export const buildAttendanceWarning = (warnings: StepAttendance[]): string =>
  `Hors des dispos de : ${warnings.map((w) => describeAttendanceDetail(w)).join(', ')}.`;

/** One step of the day: times, who comes, warnings and the organizer's actions. */
export const PlanningStepCard: React.FC<PlanningStepCardProps> = ({
  view,
  isFirst,
  isLast,
  canEdit,
  isSaving,
  onMove,
  onEditDuration,
}) => {
  const { step } = view;
  const id = step.id;
  return (
    <Card testID={`planning-step-${id}`} style={styles.card}>
      <View style={styles.header}>
        <AppText weight="bold" testID={`planning-step-time-${id}`}>
          {view.start} – {view.end}
        </AppText>
        <AppText variant="caption" color="secondary">
          {formatDuration(view.durationMin)}
        </AppText>
        {step.activity_id ? <Badge label="🗳️ Activité retenue" tone="primary" /> : null}
      </View>
      <AppText weight="semibold">{step.title}</AppText>
      {step.notes ? (
        <AppText variant="bodySmall" color="secondary">
          {step.notes}
        </AppText>
      ) : null}
      <StepAttendanceList attendance={view.attendance} testID={`planning-attendance-${id}`} />
      {view.warnings.length > 0 ? (
        <InlineAlert
          tone="warning"
          message={buildAttendanceWarning(view.warnings)}
          testID={`planning-warning-${id}`}
        />
      ) : null}
      {canEdit ? (
        <View style={styles.actions}>
          <IconButton
            icon="arrow-up"
            size="sm"
            variant="surface"
            accessibilityLabel={`Avancer ${step.title}`}
            disabled={isFirst || isSaving}
            onPress={() => onMove(id, 'up')}
            testID={`planning-move-up-${id}`}
          />
          <IconButton
            icon="arrow-down"
            size="sm"
            variant="surface"
            accessibilityLabel={`Reculer ${step.title}`}
            disabled={isLast || isSaving}
            onPress={() => onMove(id, 'down')}
            testID={`planning-move-down-${id}`}
          />
          <Button
            title="Durée"
            size="sm"
            variant="outline"
            leftIcon="time-outline"
            disabled={isSaving}
            onPress={() => onEditDuration(view)}
            testID={`planning-duration-${id}`}
          />
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  card: {
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
