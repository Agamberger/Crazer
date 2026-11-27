import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { PlaceNameLabel } from '@/features/carte/components/PlaceNameLabel';
import { ActivityVote } from '@/shared/types';
import { ActivityResult } from '../../types/activities';

export interface ActivityVoteCardProps {
  result: ActivityResult;
  /** Display names by user id, to list who voted. */
  memberNames: Record<string, string>;
  /** The user attends the outing: votes and places activities. */
  canVote: boolean;
  onVote: (activityId: string, vote: ActivityVote) => void;
  /** Author or organizer: deletes the proposal. */
  onRemove?: (activityId: string) => void;
  /** Adds the activity at the end of the programme. */
  onPlace?: (result: ActivityResult) => void;
  /** Handle to drag the activity onto the programme. */
  dragHandle?: React.ReactNode;
}

const namesOf = (ids: string[], names: Record<string, string>): string =>
  ids.map((id) => names[id] ?? 'Quelqu’un').join(', ');

/** One activity of the pool: live score, who voted what, voting and « → Programme » buttons. */
export const ActivityVoteCard: React.FC<ActivityVoteCardProps> = ({
  result,
  memberNames,
  canVote,
  onVote,
  onRemove,
  onPlace,
  dragHandle,
}) => {
  const { activity, acceptedUserIds, maybeUserIds, myVote } = result;
  const id = activity.id;

  return (
    <Card style={styles.card} testID={`activity-${id}`}>
      <View style={styles.header}>
        <AppText weight="semibold" style={styles.title}>
          {activity.title}
        </AppText>
        {dragHandle}
      </View>
      {activity.place ? (
        <PlaceNameLabel place={activity.place} showAddress testID={`activity-place-${id}`} />
      ) : null}
      {activity.note ? (
        <AppText variant="bodySmall" color="secondary">
          {activity.note}
        </AppText>
      ) : null}
      <AppText variant="caption" color="secondary" testID={`activity-score-${id}`}>
        ✅ {acceptedUserIds.length} · 🤔 {maybeUserIds.length} · {result.score} pt
        {result.score > 1 ? 's' : ''}
      </AppText>
      {acceptedUserIds.length + maybeUserIds.length > 0 ? (
        <AppText variant="caption" color="muted" testID={`activity-voters-${id}`}>
          {acceptedUserIds.length > 0 ? `Partants : ${namesOf(acceptedUserIds, memberNames)}` : ''}
          {acceptedUserIds.length > 0 && maybeUserIds.length > 0 ? ' — ' : ''}
          {maybeUserIds.length > 0 ? `Peut-être : ${namesOf(maybeUserIds, memberNames)}` : ''}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        {canVote ? (
          <>
            <Button
              title="Partant"
              size="sm"
              variant={myVote === 'accepted' ? 'primary' : 'outline'}
              onPress={() => onVote(id, 'accepted')}
              testID={`btn-vote-accepted-${id}`}
              accessibilityLabel={`Partant pour ${activity.title}`}
            />
            <Button
              title="Peut-être"
              size="sm"
              variant={myVote === 'maybe' ? 'primary' : 'outline'}
              onPress={() => onVote(id, 'maybe')}
              testID={`btn-vote-maybe-${id}`}
              accessibilityLabel={`Peut-être pour ${activity.title}`}
            />
          </>
        ) : null}
        {onPlace ? (
          <Button
            title="→ Programme"
            size="sm"
            variant="secondary"
            onPress={() => onPlace(result)}
            testID={`btn-place-${id}`}
            accessibilityLabel={`Ajouter ${activity.title} au programme`}
          />
        ) : null}
        {onRemove ? (
          <Button
            title="Supprimer"
            size="sm"
            variant="ghost"
            onPress={() => onRemove(id)}
            testID={`btn-remove-${id}`}
          />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
});
