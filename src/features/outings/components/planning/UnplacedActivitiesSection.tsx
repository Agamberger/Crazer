import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingActivity } from '../../types/activities';

export interface UnplacedActivitiesSectionProps {
  activities: OutingActivity[];
  /** Organizer: shows « Placer » on each activity. */
  canPlace: boolean;
  isSaving: boolean;
  onPlace: (activityId: string) => void;
}

/** Retained activities that are not in the planning yet. */
export const UnplacedActivitiesSection: React.FC<UnplacedActivitiesSectionProps> = ({
  activities,
  canPlace,
  isSaving,
  onPlace,
}) => {
  if (activities.length === 0) return null;
  return (
    <View style={styles.section} testID="planning-unplaced">
      <SectionHeader title="Activités retenues à placer" />
      {activities.map((activity) => (
        <Card key={activity.id} style={styles.card} testID={`planning-unplaced-${activity.id}`}>
          <View style={styles.texts}>
            <AppText weight="semibold">{activity.title}</AppText>
            {activity.place ? (
              <AppText variant="caption" color="secondary">
                📍 {activity.place.name}
              </AppText>
            ) : null}
          </View>
          {canPlace ? (
            <Button
              title="Placer"
              size="sm"
              variant="outline"
              leftIcon="add"
              disabled={isSaving}
              onPress={() => onPlace(activity.id)}
              testID={`planning-place-${activity.id}`}
            />
          ) : null}
        </Card>
      ))}
      {!canPlace ? (
        <AppText variant="caption" color="muted">
          L’organisateur place les activités retenues dans la journée.
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
