import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText, Button, InlineAlert } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '@/features/auth';
import { usePlaceHours } from '../hooks/usePlaceHours';
import { formatOpeningPeriods, isOpenAt } from '../utils/openingPeriods';
import { OpeningHoursEditor } from './OpeningHoursEditor';

export interface PlaceHoursSectionProps {
  /** `places` id, or `null` while the place is not saved yet. */
  placeId: string | null;
  /** Saves the place if needed and returns its `places` id (before the first proposal). */
  resolvePlaceId: () => Promise<string>;
  /** Hours from another source (Google Maps…), shown when the community has none. */
  fallbackHours?: string[];
  /** « Open now » from that other source. */
  fallbackOpenNow?: boolean;
  /** Name of that other source, revealed on demand when community hours exist. */
  fallbackSourceLabel?: string;
  /** Clock, injectable for tests. */
  now?: () => Date;
}

const HourLines: React.FC<{ lines: string[]; testID: string }> = ({ lines, testID }) => (
  <View testID={testID}>
    {lines.map((line) => (
      <AppText key={line} variant="caption" color="secondary">
        {line}
      </AppText>
    ))}
  </View>
);

const OpenNow: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <AppText variant="bodySmall" color={isOpen ? 'success' : 'error'} testID="place-hours-open-now">
    {isOpen ? 'Ouvert maintenant' : 'Fermé maintenant'}
  </AppText>
);

/**
 * Opening hours of a place, merging the community's and another source's, discreetly:
 * confirmed community hours come first with a small ✓ (tap: who confirmed), the other
 * source's hours stay one tap away; proposals to check and « Proposer des horaires » are
 * quiet links.
 */
export const PlaceHoursSection: React.FC<PlaceHoursSectionProps> = ({
  placeId,
  resolvePlaceId,
  fallbackHours,
  fallbackOpenNow,
  fallbackSourceLabel,
  now = () => new Date(),
}) => {
  const { user } = useAuth();
  const hours = usePlaceHours({ placeId, resolvePlaceId, userId: user?.id ?? null });
  const [showConfirmInfo, setShowConfirmInfo] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasFallback = Boolean(fallbackHours && fallbackHours.length > 0);

  const renderMain = (): React.ReactNode => {
    if (hours.confirmed) {
      const confirmed = hours.confirmed;
      return (
        <>
          <View style={styles.row}>
            <OpenNow isOpen={isOpenAt(confirmed.periods, now())} />
            <TouchableOpacity
              onPress={() => setShowConfirmInfo((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel="Horaires confirmés par la communauté"
              testID="place-hours-confirmed-mark"
            >
              <AppText variant="caption" color="success">
                ✓
              </AppText>
            </TouchableOpacity>
          </View>
          {showConfirmInfo ? (
            <AppText variant="caption" color="muted" testID="place-hours-confirmed-info">
              Horaires confirmés par {confirmed.yesCount} membres de Crazer
            </AppText>
          ) : null}
          <HourLines
            lines={formatOpeningPeriods(confirmed.periods)}
            testID="place-hours-community"
          />
          {hasFallback ? (
            <TouchableOpacity
              onPress={() => setShowFallback((value) => !value)}
              accessibilityRole="button"
              testID="place-hours-fallback-toggle"
            >
              <AppText variant="caption" color="muted">
                {showFallback ? 'Masquer' : 'Voir'} les horaires{' '}
                {fallbackSourceLabel ?? 'd’origine'}
              </AppText>
            </TouchableOpacity>
          ) : null}
          {showFallback && fallbackHours ? (
            <HourLines lines={fallbackHours} testID="place-hours-fallback" />
          ) : null}
        </>
      );
    }
    if (hasFallback && fallbackHours) {
      return (
        <>
          {fallbackOpenNow !== undefined ? <OpenNow isOpen={fallbackOpenNow} /> : null}
          <HourLines lines={fallbackHours} testID="place-hours-fallback" />
        </>
      );
    }
    return (
      <AppText variant="caption" color="muted">
        Horaires inconnus.
      </AppText>
    );
  };

  return (
    <View style={styles.section} testID="place-hours-section">
      <AppText weight="semibold">Horaires</AppText>
      {renderMain()}

      {hours.toReview && hours.myVote === null ? (
        <View style={styles.review} testID="place-hours-review">
          <AppText variant="caption" color="secondary">
            Un membre propose : {formatOpeningPeriods(hours.toReview.periods).join(' · ')}. C’est
            juste ?
          </AppText>
          <View style={styles.row}>
            <Button
              title="Oui"
              size="sm"
              variant="ghost"
              disabled={hours.isSaving}
              onPress={() => void hours.vote(true)}
              testID="place-hours-vote-yes"
            />
            <Button
              title="Non"
              size="sm"
              variant="ghost"
              disabled={hours.isSaving}
              onPress={() => void hours.vote(false)}
              testID="place-hours-vote-no"
            />
          </View>
        </View>
      ) : null}

      {hours.myPending ? (
        <AppText variant="caption" color="muted" testID="place-hours-my-pending">
          Ta proposition attend la confirmation de deux membres.
        </AppText>
      ) : null}

      {hours.error ? (
        <InlineAlert tone="error" message={hours.error} onDismiss={hours.clearError} />
      ) : null}

      <Button
        title={hours.confirmed ? 'Corriger les horaires' : 'Proposer des horaires'}
        size="sm"
        variant="ghost"
        onPress={() => setIsEditing(true)}
        style={styles.link}
        testID="place-hours-edit"
      />

      <OpeningHoursEditor
        visible={isEditing}
        initialPeriods={hours.confirmed?.periods ?? []}
        isSaving={hours.isSaving}
        onCancel={() => setIsEditing(false)}
        onSubmit={(periods) => {
          void hours.propose(periods).then((saved) => {
            if (saved) setIsEditing(false);
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
  },
  review: {
    gap: 2,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
});
