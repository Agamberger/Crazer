import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, InlineAlert, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ActivityVote } from '@/shared/types';
import { ActivityGroup, ActivityResult } from '../../types/activities';
import { formatDayLabel } from '../../utils/availabilityUtils';
import { ActivityVoteCard } from './ActivityVoteCard';

export interface ActivityGroupSectionProps {
  group: ActivityGroup;
  memberNames: Record<string, string>;
  currentUserId: string | null;
  canVote: boolean;
  isOrganizer: boolean;
  onVote: (activityId: string, vote: ActivityVote) => void;
  onChoose: (activityId: string) => void;
  onRemove: (activityId: string) => void;
  onReopen: (day: string | null) => void;
  /** Opens the tie-break screen of this group. */
  onOpenTie: (day: string | null) => void;
  onConvert: (result: ActivityResult) => void;
}

export const groupTitle = (day: string | null): string =>
  day ? formatDayLabel(day) : 'Quel que soit le jour';

/** Activities of one day (or « any day »): ranking, tie banner and decision. */
export const ActivityGroupSection: React.FC<ActivityGroupSectionProps> = ({
  group,
  memberNames,
  currentUserId,
  canVote,
  isOrganizer,
  onVote,
  onChoose,
  onRemove,
  onReopen,
  onOpenTie,
  onConvert,
}) => {
  const key = group.day ?? 'any';
  const isDecided = group.state === 'decided';

  return (
    <View style={styles.container} testID={`activity-group-${key}`}>
      <SectionHeader title={groupTitle(group.day)} />
      {group.state === 'empty' ? (
        <AppText color="muted" testID={`activity-group-empty-${key}`}>
          Aucune proposition pour l’instant.
        </AppText>
      ) : null}
      {group.state === 'tie' ? (
        <InlineAlert
          tone="warning"
          message={`Égalité entre ${group.tiedResults.map((r) => r.activity.title).join(' et ')}.`}
          testID={`activity-tie-${key}`}
        />
      ) : null}
      {group.state === 'tie' ? (
        <Button
          title={isOrganizer ? 'Départager' : 'Voir l’égalité'}
          variant="secondary"
          fullWidth
          onPress={() => onOpenTie(group.day)}
          testID={`btn-open-tie-${key}`}
        />
      ) : null}
      {group.results.map((result) => {
        const isChosen = result.activity.chosen;
        const canDelete = isOrganizer || result.activity.proposedBy === currentUserId;
        return (
          <ActivityVoteCard
            key={result.activity.id}
            result={result}
            memberNames={memberNames}
            canVote={canVote && !isDecided}
            isOrganizer={isOrganizer}
            isChosen={isChosen}
            canChoose={isOrganizer && !isDecided}
            onConvert={isDecided && !isChosen ? onConvert : undefined}
            onVote={onVote}
            onChoose={onChoose}
            onRemove={canDelete && !isDecided ? onRemove : undefined}
          />
        );
      })}
      {isDecided && isOrganizer ? (
        <Button
          title="Rouvrir le vote"
          variant="ghost"
          onPress={() => onReopen(group.day)}
          testID={`btn-reopen-${key}`}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
