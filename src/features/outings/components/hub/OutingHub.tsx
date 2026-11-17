import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState, IconButton, Loader, Screen } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useOutingHub } from '../../hooks/useOutingHub';
import { HubSection } from '../../types/hub';
import { ParticipantAvatars } from '../scheduling/ParticipantAvatars';
import { WhatPanel } from './WhatPanel';
import { WhatSummaryView } from './WhatSummaryView';
import { HubSectionRow } from './HubSectionRow';
import { OutingHubTitle } from './OutingHubTitle';
import { WhenPanel } from './WhenPanel';
import { WhenSummaryView } from './WhenSummaryView';
import { WhoPanel } from './WhoPanel';

export interface OutingHubProps {
  outingId: string;
  onClose: () => void;
  /** Opens the planning of the day. */
  onOpenPlanning: () => void;
}

/**
 * Main screen of an outing, for its creation and its edition: the name at the top, then the
 * « Quand ? », « Qui ? » and « Quoi ? » sections, each with a visual summary of its content.
 */
export const OutingHub: React.FC<OutingHubProps> = ({ outingId, onClose, onOpenPlanning }) => {
  const hub = useOutingHub(outingId);
  const [openSection, setOpenSection] = useState<HubSection | null>(null);
  const { outing } = hub;

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="ghost"
        accessibilityLabel="Retour"
        onPress={onClose}
        testID="btn-hub-close"
      />
    </View>
  );

  if (!outing) {
    return (
      <Screen header={header} testID="outing-hub">
        {hub.error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Sortie introuvable"
            description={hub.error}
          />
        ) : (
          <Loader fullScreen message="Chargement de la sortie..." />
        )}
      </Screen>
    );
  }

  return (
    <Screen scrollable avoidKeyboard header={header} testID="outing-hub">
      <OutingHubTitle title={outing.title} editable={hub.isOrganizer} onRename={hub.rename} />
      <View style={styles.sections}>
        <HubSectionRow
          emoji="📅"
          title="Quand ?"
          onPress={() => setOpenSection('when')}
          accessibilityLabel="Ouvrir Quand ?"
          testID="hub-row-when"
        >
          <WhenSummaryView summary={hub.when} />
        </HubSectionRow>
        <HubSectionRow
          emoji="👥"
          title="Qui ?"
          onPress={() => setOpenSection('who')}
          accessibilityLabel="Ouvrir Qui ?"
          testID="hub-row-who"
        >
          <ParticipantAvatars members={hub.members} testID="hub-who-avatars" />
        </HubSectionRow>
        <HubSectionRow
          emoji="🎯"
          title="Quoi ?"
          onPress={() => setOpenSection('what')}
          accessibilityLabel="Ouvrir Quoi ?"
          testID="hub-row-what"
        >
          <WhatSummaryView summary={hub.what} />
        </HubSectionRow>
      </View>
      <WhenPanel
        visible={openSection === 'when'}
        onClose={() => setOpenSection(null)}
        outing={outing}
        scheduling={hub.scheduling}
        recaps={hub.recaps}
        pendingCount={hub.pendingCount}
        userId={hub.userId}
        isOrganizer={hub.isOrganizer}
      />
      <WhatPanel
        visible={openSection === 'what'}
        onClose={() => setOpenSection(null)}
        outing={outing}
        userId={hub.userId}
        isOrganizer={hub.isOrganizer}
        onOpenPlanning={onOpenPlanning}
      />
      <WhoPanel
        visible={openSection === 'who'}
        onClose={() => setOpenSection(null)}
        outing={outing}
        members={hub.members}
        scheduling={hub.scheduling}
        userId={hub.userId}
        isOrganizer={hub.isOrganizer}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sections: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
