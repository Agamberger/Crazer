import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

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

export const InterestsSection: React.FC<InterestsSectionProps> = ({
  interests,
  onAddInterest,
}) => {
  return (
    <View style={styles.container} testID="interests-section">
      <View style={styles.header}>
        <Text style={styles.title}>{"💡 Centres d'intérêt"}</Text>
        {onAddInterest && (
          <TouchableOpacity
            onPress={onAddInterest}
            style={styles.addButton}
            accessibilityLabel="Ajouter un centre d'intérêt"
            accessibilityRole="button"
          >
            <Text style={styles.addText}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tagsContainer}>
        {interests.map((interest, index) => {
          const emoji = EMOJI_MAP[interest] || '🎯';
          return (
            <View key={index} style={styles.tag} testID={`tag-interest-${index}`}>
              <Text style={styles.tagText}>
                {emoji} {interest}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  addText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  container: {
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
});
