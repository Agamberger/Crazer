import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppModal,
  AppText,
  Button,
  Chip,
  ConfirmDialog,
  InlineAlert,
  MultiDateCalendar,
  SectionHeader,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { useWhenPanel } from '../../hooks/useWhenPanel';
import { DayRecap, OutingScheduling } from '../../types/scheduling';
import { formatDayLabel } from '../../utils/availabilityUtils';
import { formatOutingDate } from '../../utils/hubSummaryUtils';
import { DayRecapRow } from '../scheduling/DayRecapRow';
import { MySlotsEditor } from './MySlotsEditor';

export interface WhenPanelProps {
  visible: boolean;
  onClose: () => void;
  outing: OutingRow;
  scheduling: OutingScheduling | null;
  recaps: DayRecap[];
  pendingCount: number;
  userId: string | null;
  isOrganizer: boolean;
}

const pendingMessage = (count: number): string =>
  `En attente de ${count} réponse${count > 1 ? 's' : ''}.`;

/**
 * « Quand ? » panel of the hub: the chosen date, the candidate days (organizer), my slots and
 * the live recap of everyone's availability, where the organizer chooses the day.
 */
export const WhenPanel: React.FC<WhenPanelProps> = (props) => {
  const { visible, onClose, outing, recaps, pendingCount, isOrganizer } = props;
  const panel = useWhenPanel(props);
  const { dayChoice } = panel;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      variant="slideOver"
      title="Quand ?"
      footer={
        <Button
          title="Enregistrer"
          fullWidth
          disabled={!panel.canSave}
          loading={panel.isSaving}
          onPress={() => void panel.save()}
          style={styles.footerButton}
          testID="btn-when-save"
        />
      }
      testID="hub-when-panel"
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {panel.feedback ? (
          <InlineAlert
            tone={panel.feedback.tone}
            message={panel.feedback.message}
            testID="when-feedback"
          />
        ) : null}

        {outing.start_date ? (
          <View style={styles.chosen}>
            <AppText variant="h3" color="accent" testID="when-chosen-date">
              📅 {formatOutingDate(outing.start_date)}
            </AppText>
            {isOrganizer ? (
              <Button
                title="Changer de jour"
                variant="outline"
                size="sm"
                loading={dayChoice.isSaving}
                onPress={() => void panel.clearDay()}
                testID="btn-when-clear-day"
              />
            ) : null}
          </View>
        ) : null}

        <SectionHeader title="Jours possibles" />
        {panel.canEditDays ? (
          <MultiDateCalendar
            values={panel.days}
            onChange={panel.setDays}
            minDate={panel.today}
            testID="when-calendar"
          />
        ) : (
          <View style={styles.chips} testID="when-days">
            {panel.days.length === 0 ? (
              <AppText color="secondary">L’organisateur n’a pas encore proposé de jour.</AppText>
            ) : (
              panel.days.map((day) => <Chip key={day} label={formatDayLabel(day)} />)
            )}
          </View>
        )}

        {panel.days.length > 0 ? <SectionHeader title="Mes dispos" /> : null}
        {panel.days.length > 0 && panel.canGiveSlots ? (
          <MySlotsEditor
            days={panel.days}
            slots={panel.mySlots}
            onChangeAvailable={panel.setAvailable}
            onChangeSlot={panel.setSlot}
          />
        ) : null}
        {panel.days.length > 0 && !panel.canGiveSlots ? (
          <InlineAlert tone="info" message="Réponds à l’invitation pour donner tes dispos." />
        ) : null}

        {recaps.length > 0 ? <SectionHeader title="Créneau commun par jour" /> : null}
        {pendingCount > 0 && recaps.length > 0 ? (
          <InlineAlert tone="info" message={pendingMessage(pendingCount)} testID="when-pending" />
        ) : null}
        {recaps.map((recap) => (
          <DayRecapRow
            key={recap.day}
            recap={recap}
            onChooseDay={isOrganizer && !outing.start_date ? dayChoice.chooseDay : undefined}
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={dayChoice.pendingChoice !== null}
        title="Continuer sans tout le monde ?"
        message={`${pendingMessage(pendingCount)} Tu peux planifier la sortie maintenant ou attendre leurs dispos.`}
        confirmLabel="Planifier quand même"
        loading={dayChoice.isSaving}
        onConfirm={() => void dayChoice.confirmPendingChoice()}
        onCancel={dayChoice.cancelPendingChoice}
      />
    </AppModal>
  );
};

const styles = StyleSheet.create({
  footerButton: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chosen: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
