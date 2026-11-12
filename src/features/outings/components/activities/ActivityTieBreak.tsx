import React, { useMemo } from 'react';
import { AppText, Button, EmptyState, InlineAlert, Loader, Screen } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useActivityTieBreak } from '../../hooks/useActivityTieBreak';
import { ActivityResult } from '../../types/activities';
import { ActivityVoteCard } from './ActivityVoteCard';
import { groupTitle } from './ActivityGroupSection';
import { DrawRoulette } from './DrawRoulette';

export interface ActivityTieBreakProps {
  outingId: string;
  /** `null` = the « any day » group. */
  day: string | null;
  onConvert: (result: ActivityResult) => void;
  onClose: () => void;
}

const CONTENT_STYLE = { gap: spacing.md } as const;
const NOOP = () => undefined;

/**
 * Tie screen: the tied activities, then a random draw (animated roulette) or a choice
 * made by hand by the organizer. Members follow the decision live.
 */
export const ActivityTieBreak: React.FC<ActivityTieBreakProps> = ({
  outingId,
  day,
  onConvert,
  onClose,
}) => {
  const tie = useActivityTieBreak(outingId, day);
  const memberNames = useMemo(
    () => Object.fromEntries(tie.members.map((m) => [m.userId, m.displayName])),
    [tie.members],
  );
  const closeButton = <Button title="Retour aux votes" variant="ghost" fullWidth onPress={onClose} testID="btn-tie-close" />;

  if (!tie.isReady || !tie.group) {
    return (
      <Screen testID="tie-loading">
        <Loader fullScreen message="Chargement..." />
      </Screen>
    );
  }

  const isAnimating = tie.draw !== null && !tie.isRevealed;
  const { chosenResult } = tie.group;

  if (!isAnimating && chosenResult) {
    return (
      <Screen scrollable contentStyle={CONTENT_STYLE} footer={closeButton} testID="tie-decided">
        <AppText variant="h2">{groupTitle(day)}</AppText>
        <InlineAlert
          tone="success"
          message={`C’est décidé : ${chosenResult.activity.title} !`}
          testID="tie-winner"
        />
        {tie.group.results
          .filter((r) => r !== chosenResult && r.score === chosenResult.score)
          .map((r) => (
            <ActivityVoteCard
              key={r.activity.id}
              result={r}
              memberNames={memberNames}
              canVote={false}
              isOrganizer={tie.isOrganizer}
              isChosen={false}
              canChoose={false}
              onConvert={onConvert}
              onVote={NOOP}
              onChoose={NOOP}
            />
          ))}
      </Screen>
    );
  }

  if (isAnimating && tie.draw) {
    return (
      <Screen scrollable contentStyle={CONTENT_STYLE} testID="tie-drawing">
        <AppText variant="h2">Tirage au sort…</AppText>
        <DrawRoulette
          candidates={tie.draw.candidates}
          sequence={tie.draw.sequence}
          onFinished={tie.finishDraw}
        />
      </Screen>
    );
  }

  if (tie.group.state !== 'tie') {
    return (
      <Screen testID="tie-none">
        <EmptyState
          icon="checkmark-circle-outline"
          title="Pas d’égalité"
          description="Les votes ne sont plus à égalité."
          actionLabel="Retour aux votes"
          onAction={onClose}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      contentStyle={CONTENT_STYLE}
      footer={
        <>
          {tie.isOrganizer ? (
            <Button
              title="🎲 Tirer au sort"
              fullWidth
              loading={tie.isDrawing}
              onPress={tie.startDraw}
              testID="btn-tie-draw"
            />
          ) : null}
          {closeButton}
        </>
      }
      testID="tie-break"
    >
      <AppText variant="h2">Égalité !</AppText>
      <AppText color="secondary">
        {groupTitle(day)} : {tie.group.tiedResults.length} activités ont le même score.
      </AppText>
      {tie.group.tiedResults.map((result) => (
        <ActivityVoteCard
          key={result.activity.id}
          result={result}
          memberNames={memberNames}
          canVote={false}
          isOrganizer={tie.isOrganizer}
          isChosen={false}
          canChoose={tie.isOrganizer}
          onVote={NOOP}
          onChoose={tie.choose}
        />
      ))}
      {tie.isOrganizer ? (
        <AppText color="muted">
          Choisis toi-même ou tire au sort : l’organisateur départage.
        </AppText>
      ) : (
        <InlineAlert
          tone="info"
          message="L’organisateur va départager. Tu verras le résultat ici en direct."
          testID="tie-waiting"
        />
      )}
    </Screen>
  );
};
