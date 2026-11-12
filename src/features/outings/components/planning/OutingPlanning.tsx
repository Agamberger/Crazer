import React, { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  ChipGroup,
  EmptyState,
  Loader,
  Screen,
  SectionHeader,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { TRAVEL_TIME_OPTIONS } from '../../constants';
import { useOutingPlanning } from '../../hooks/useOutingPlanning';
import { PlanningStepView } from '../../types/planning';
import { formatDayLabel } from '../../utils/availabilityUtils';
import { MyAvailabilityCard } from './MyAvailabilityCard';
import { PlanningGapRow } from './PlanningGapRow';
import { PlanningStepCard } from './PlanningStepCard';
import { StepDurationModal } from './StepDurationModal';
import { UnplacedActivitiesSection } from './UnplacedActivitiesSection';

export interface OutingPlanningProps {
  outingId: string;
  onClose: () => void;
}

const CONTENT_STYLE = { gap: spacing.md } as const;

/** Step 6 of the outing journey: the day's planning, live for every member. */
export const OutingPlanning: React.FC<OutingPlanningProps> = ({ outingId, onClose }) => {
  const plan = useOutingPlanning(outingId);
  const [editedStep, setEditedStep] = useState<PlanningStepView | null>(null);

  if (plan.loadFailed) {
    return (
      <Screen testID="planning-load-failed">
        <EmptyState
          icon="help-circle-outline"
          title="Planning indisponible"
          description="Impossible de charger le planning. Réessaie plus tard."
          actionLabel="Fermer"
          onAction={onClose}
        />
      </Screen>
    );
  }

  if (!plan.isReady || !plan.outing) {
    return (
      <Screen testID="planning-loading">
        <Loader fullScreen message="Chargement du planning..." />
      </Screen>
    );
  }

  const { planning } = plan;
  const canSuggest =
    !!planning && (planning.steps.length > 0 || planning.unplacedActivities.length > 0);

  return (
    <Screen
      scrollable
      contentStyle={CONTENT_STYLE}
      footer={<Button title="Terminer" fullWidth onPress={onClose} testID="btn-planning-close" />}
      testID="outing-planning"
    >
      <AppText variant="h2">{plan.outing.title}</AppText>
      <AppText color="secondary">
        {plan.isOrganizer
          ? 'Place les activités retenues dans la journée : l’app propose des horaires selon les dispos de chacun, tu choisis l’ordre. Tout le monde voit le planning en direct.'
          : 'Le planning de la journée, mis à jour en direct par l’organisateur.'}
      </AppText>

      {plan.days.length > 1 ? (
        <ChipGroup
          label="Jour"
          options={plan.days.map((day) => ({ value: day, label: formatDayLabel(day) }))}
          value={plan.selectedDay}
          onChange={plan.selectDay}
          testID="planning-day"
        />
      ) : null}

      {!planning ? (
        <EmptyState
          icon="calendar-outline"
          title="Aucun jour à planifier"
          description="Ajoute des jours candidats ou une étape à la sortie pour construire le planning."
          testID="planning-no-day"
        />
      ) : (
        <>
          <SectionHeader title={`Programme · ${formatDayLabel(planning.day)}`} />
          <AppText variant="caption" color="secondary" testID="planning-suggested-start">
            Début conseillé : {planning.suggestedStart} (quand la majorité est dispo)
          </AppText>

          {plan.isOrganizer ? (
            <>
              <ChipGroup
                label="Trajet entre deux activités"
                options={TRAVEL_TIME_OPTIONS}
                value={plan.travelMin}
                onChange={plan.setTravelMin}
                testID="planning-travel"
              />
              <Button
                title="✨ Proposer des horaires"
                variant="secondary"
                disabled={!canSuggest}
                loading={plan.isSaving}
                onPress={() => void plan.suggest()}
                testID="btn-planning-suggest"
              />
            </>
          ) : null}

          {planning.steps.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="Rien de prévu ce jour-là"
              description={
                plan.isOrganizer
                  ? 'Place une activité retenue ou propose des horaires.'
                  : 'L’organisateur n’a encore rien placé.'
              }
              testID="planning-empty"
            />
          ) : (
            <View testID="planning-steps">
              {planning.steps.map((view, index) => (
                <React.Fragment key={view.step.id}>
                  <PlanningGapRow gap={view.gapBefore} testID={`planning-gap-${view.step.id}`} />
                  <PlanningStepCard
                    view={view}
                    isFirst={index === 0}
                    isLast={index === planning.steps.length - 1}
                    canEdit={plan.isOrganizer}
                    isSaving={plan.isSaving}
                    onMove={(id, direction) => void plan.move(id, direction)}
                    onEditDuration={setEditedStep}
                  />
                </React.Fragment>
              ))}
            </View>
          )}

          <UnplacedActivitiesSection
            activities={planning.unplacedActivities}
            canPlace={plan.isOrganizer}
            isSaving={plan.isSaving}
            onPlace={(id) => void plan.place(id)}
          />

          {plan.canSetMyAvailability ? (
            <MyAvailabilityCard
              slot={plan.mySlot}
              isSaving={plan.isSaving}
              onSave={(range) => void plan.saveMyAvailability(range)}
            />
          ) : null}
        </>
      )}

      <StepDurationModal
        step={editedStep}
        isSaving={plan.isSaving}
        onClose={() => setEditedStep(null)}
        onSave={(id, minutes) => {
          setEditedStep(null);
          void plan.setDuration(id, minutes);
        }}
      />
    </Screen>
  );
};
