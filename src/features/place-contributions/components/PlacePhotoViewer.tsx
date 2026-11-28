import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { AppModal, AppText, Button, ChipGroup, ChipOption } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DisplayedPlacePhoto } from '../hooks/usePlacePhotos';
import { PhotoReportReason } from '../types/contributions';

const REPORT_REASONS: ReadonlyArray<ChipOption<PhotoReportReason>> = [
  { value: 'inappropriate', label: 'Inapproprié' },
  { value: 'wrong_place', label: 'Mauvais lieu' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Autre' },
];

export interface PlacePhotoViewerProps {
  /** Photo to show; the viewer is hidden while `null`. */
  photo: DisplayedPlacePhoto | null;
  /** The current user uploaded the photo: « Supprimer » instead of « Signaler ». */
  isOwnPhoto: boolean;
  onClose: () => void;
  onReport: (reason: PhotoReportReason) => Promise<void>;
  onDelete: () => Promise<void>;
}

/** Full-size view of a community photo, with « Signaler » (others) or « Supprimer » (own). */
export const PlacePhotoViewer: React.FC<PlacePhotoViewerProps> = ({
  photo,
  isOwnPhoto,
  onClose,
  onReport,
  onDelete,
}) => {
  const [reason, setReason] = useState<PhotoReportReason | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setIsBusy(true);
    try {
      await action();
      setReason(null);
      onClose();
    } catch {
      // The hook keeps the French error message, shown by the photos section.
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppModal
      visible={photo !== null}
      onClose={onClose}
      variant="fullScreen"
      title="Photo de la communauté"
      testID="place-photo-viewer"
    >
      {photo ? (
        <ScrollView contentContainerStyle={styles.content} testID="place-photo-viewer-scroll">
          {photo.fullUrl ? (
            <Image
              source={{ uri: photo.fullUrl }}
              style={[styles.image, { aspectRatio: photo.width / photo.height }]}
              resizeMode="contain"
              accessibilityLabel={`Photo ajoutée par ${photo.uploaderName}`}
            />
          ) : (
            <AppText color="muted">Photo indisponible.</AppText>
          )}
          <AppText variant="bodySmall" color="secondary" testID="place-photo-viewer-credit">
            © {photo.uploaderName}
          </AppText>
          {isOwnPhoto ? (
            <Button
              title="Supprimer ma photo"
              variant="danger"
              loading={isBusy}
              onPress={() => void run(onDelete)}
              testID="place-photo-delete"
            />
          ) : (
            <View style={styles.report}>
              <ChipGroup
                label="Signaler cette photo"
                options={REPORT_REASONS}
                value={reason}
                onChange={setReason}
                testID="place-photo-report-reason"
              />
              <Button
                title="Signaler"
                variant="outline"
                disabled={reason === null}
                loading={isBusy}
                onPress={() => {
                  if (reason) void run(() => onReport(reason));
                }}
                testID="place-photo-report"
              />
            </View>
          )}
        </ScrollView>
      ) : null}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  image: {
    width: '100%',
  },
  report: {
    gap: spacing.sm,
  },
});
