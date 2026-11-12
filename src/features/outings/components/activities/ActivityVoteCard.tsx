import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ActivityVote } from '@/shared/types';
import { ActivityResult } from '../../types/activities';

export interface ActivityVoteCardProps {
  result: ActivityResult;
  /** Display names by user id, to list who voted. */
  memberNames: Record<string, string>;
  /** Votes are open (member who can vote, group not decided). */
  canVote: boolean;
  isOrganizer: boolean;
  /** Highlights the activity the organizer retained. */
  isChosen: boolean;
  /** Organizer: shows « Retenir » on this activity. */
  canChoose: boolean;
  /** Shown on not retained activities once the group is decided. */
  onConvert?: (result: ActivityResult) => void;
  onVote: (activityId: string, vote: ActivityVote) => void;
  onChoose: (activityId: string) => void;
  onRemove?: (activityId: string) => void;
}

const namesOf = (ids: string[], names: Record<string, string>): string =>
  ids.map((id) => names[id] ?? 'Quelqu’un').join(', ');

/** One proposed activity: live score, who voted what and the voting buttons. */
export const ActivityVoteCard: React.FC<ActivityVoteCardProps> = ({
  result,
  memberNames,
  canVote,
  isChosen,
  canChoose,
  onConvert,
  onVote,
  onChoose,
  onRemove,
}) => {
  const { activity, acceptedUserIds, maybeUserIds, myVote } = result;
  const id = activity.id;

  return (
    <Card variant={isChosen ? 'outlined' : 'default'} style={styles.card} testID={`activity-${id}`}>
      <View style={styles.header}>
        <AppText weight="semibold" style={styles.title}>
          {activity.title}
        </AppText>
        {isChosen ? <Badge label="Retenue" tone="success" testID={`activity-chosen-${id}`} /> : null}
      </View>
      {activity.place ? (
        <AppText variant="bodySmall" color="secondary" testID={`activity-place-${id}`}>
          📍 {activity.place.name}
          {activity.place.address ? ` · ${activity.place.address}` : ''}
        </AppText>
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
        {canChoose ? (
          <Button
            title="Retenir"
            size="sm"
            variant="secondary"
            onPress={() => onChoose(id)}
            testID={`btn-choose-${id}`}
          />
        ) : null}
        {onConvert ? (
          <Button
            title="En faire une sortie"
            size="sm"
            variant="ghost"
            onPress={() => onConvert(result)}
            testID={`btn-convert-${id}`}
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
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
});
