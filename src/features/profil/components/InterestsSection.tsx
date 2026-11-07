import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface InterestsSectionProps {
  interests: string[];
  onAddInterest?: () => void;
}

const EMOJI_MAP: Record<string, string> = {
  Burgers: '🍔',
  Bowling: '🎳',
  Concerts: '🎵',
  'Escape Game': '🕵️‍♂️',
  Cinema: '🎬',
  Randonnée: '🥾',
  Jeux: '🎮',
};

const DEFAULT_EMOJI = '🎯';

export const InterestsSection: React.FC<InterestsSectionProps> = ({ interests, onAddInterest }) => (
  <View style={styles.container} testID="interests-section">
    <SectionHeader
      title="💡 Centres d'intérêt"
      actionLabel={onAddInterest ? '+ Ajouter' : undefined}
      onAction={onAddInterest}
      style={styles.header}
    />

    <View style={styles.tagsContainer}>
      {interests.map((interest, index) => (
        <Chip
          key={`${interest}-${index}`}
          label={`${EMOJI_MAP[interest] || DEFAULT_EMOJI} ${interest}`}
          testID={`tag-interest-${index}`}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    marginTop: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
