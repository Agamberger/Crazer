import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ActivityResult } from '../../types/activities';
import { drawStepDelay } from '../../utils/activityUtils';

export interface DrawRouletteProps {
  candidates: ActivityResult[];
  /** Indices highlighted in turn; the last one is the winner. */
  sequence: number[];
  onFinished: () => void;
}

/** Tie-break mini-game: highlights the candidates one after the other, slowing down on the winner. */
export const DrawRoulette: React.FC<DrawRouletteProps> = ({ candidates, sequence, onFinished }) => {
  const [step, setStep] = useState(0);
  const isFinished = step >= sequence.length - 1;

  useEffect(() => {
    if (isFinished) {
      onFinished();
      return undefined;
    }
    const timer = setTimeout(() => setStep((s) => s + 1), drawStepDelay(step, sequence.length));
    return () => clearTimeout(timer);
  }, [step, isFinished, sequence.length, onFinished]);

  const highlighted = sequence[Math.min(step, sequence.length - 1)];

  return (
    <View style={styles.container} testID="draw-roulette">
      {candidates.map((candidate, index) => {
        const isHighlighted = index === highlighted;
        return (
          <Card
            key={candidate.activity.id}
            variant={isHighlighted ? 'elevated' : 'default'}
            style={[styles.card, isHighlighted && styles.highlighted]}
            testID={`roulette-${candidate.activity.id}${isHighlighted ? '-active' : ''}`}
          >
            <AppText weight={isHighlighted ? 'bold' : 'regular'} align="center">
              {isHighlighted ? '👉 ' : ''}
              {candidate.activity.title}
            </AppText>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  container: {
    gap: spacing.sm,
  },
  highlighted: {
    transform: [{ scale: 1.04 }],
  },
});
