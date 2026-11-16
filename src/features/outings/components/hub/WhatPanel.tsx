import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppModal, SectionHeader } from '@/shared/components';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { ActivityResult } from '../../types/activities';
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
  /** Opens the tie-break of a day group (`null` = « any day »). */
  onOpenTie: (day: string | null) => void;
  /** Creates a new outing named after a not retained activity. */
  onConvert: (title: string) => void;
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
  onOpenTie,
  onConvert,
  onOpenPlanning,
}) => {
  const router = useRouter();

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeader title="Type et questions" />
        <WhatQuestionsSection outingId={outing.id} />

        <SectionHeader title="Détails" />
        <WhatDetailsSection outing={outing} isOrganizer={isOrganizer} />

        <SectionHeader title="Activités" />
        <WhatActivitiesSection
          outingId={outing.id}
          userId={userId}
          onOpenTie={(day) => leave(() => onOpenTie(day))}
          onConvert={(result: ActivityResult) => leave(() => onConvert(result.activity.title))}
          onSearchOnMap={() =>
            leave(() => {
              useMapStore.getState().setTargetOutingId(outing.id, 'activity');
              router.push('/(tabs)/carte');
            })
          }
        />

        <SectionHeader title="Programme" />
        <WhatStepsSection
          outingId={outing.id}
          outingTitle={outing.title}
          onLeave={leave}
          onOpenPlanning={onOpenPlanning}
        />
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
