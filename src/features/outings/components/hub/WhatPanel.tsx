import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppModal, InlineAlert, SectionHeader } from '@/shared/components';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { useProgrammePlacement } from '../../hooks/useProgrammePlacement';
import { ProgrammeDragProvider } from './what/ProgrammeDragContext';
import { ProgrammeDragScrollView } from './what/ProgrammeDragParts';
import { WhatActivitiesSection } from './what/WhatActivitiesSection';
import { WhatDetailsSection } from './what/WhatDetailsSection';
import { WhatQuestionsSection } from './what/WhatQuestionsSection';
import { WhatStepsSection } from './what/WhatStepsSection';

export interface WhatPanelProps {
  visible: boolean;
  onClose: () => void;
  outing: OutingRow;
  userId: string | null;
  isOrganizer: boolean;
  onOpenPlanning: () => void;
}

/**
 * « Quoi ? » panel of the hub: type and guided questions, description and status, activity
 * votes, steps of the outing.
 */
export const WhatPanel: React.FC<WhatPanelProps> = ({
  visible,
  onClose,
  outing,
  userId,
  isOrganizer,
  onOpenPlanning,
}) => {
  const router = useRouter();
  const placement = useProgrammePlacement(outing);

  /** A screen pushed under a modal stays hidden: close the panel first. */
  const leave = (navigate: () => void) => {
    onClose();
    navigate();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      variant="slideOver"
      title="Quoi ?"
      testID="hub-what-panel"
    >
      <ProgrammeDragProvider
        onDrop={(activityId, index) => void placement.placeAt(activityId, index)}
      >
        <ProgrammeDragScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeader title="Type et questions" />
          <WhatQuestionsSection outingId={outing.id} />

          <SectionHeader title="Détails" />
          <WhatDetailsSection outing={outing} isOrganizer={isOrganizer} />

          <SectionHeader title="Activités" />
          {placement.error ? (
            <InlineAlert tone="error" message={placement.error} testID="what-placement-error" />
          ) : null}
          <WhatActivitiesSection
            outingId={outing.id}
            userId={userId}
            onSearchOnMap={() =>
              leave(() => {
                useMapStore.getState().setTargetOutingId(outing.id, 'activity');
                router.push('/(tabs)/carte');
              })
            }
            onPlace={(activityId) => void placement.placeAtEnd(activityId)}
          />

          <SectionHeader title="Programme" />
          <WhatStepsSection
            outingId={outing.id}
            outingTitle={outing.title}
            onLeave={leave}
            onOpenPlanning={onOpenPlanning}
          />
        </ProgrammeDragScrollView>
      </ProgrammeDragProvider>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
