import { useCallback, useEffect, useState } from 'react';
import { captureUserSession } from '@/shared/store/sessionReset';
import { ContributionError } from '../services/contributionError';
import { pickPhoto, PhotoSource, preparePhoto } from '../services/photoProcessing';
import { uploadPlacePhoto } from '../services/photoUploadService';
import { placeContributionsService } from '../services/placeContributionsService';
import { PhotoReportReason, PlacePhoto } from '../types/contributions';

/** Credit shown when the uploader has no name in their profile. */
export const UNKNOWN_UPLOADER_NAME = 'Membre Crazer';

/** A photo with its signed display URLs and the name of its uploader (credit). */
export interface DisplayedPlacePhoto extends PlacePhoto {
  thumbnailUrl: string | null;
  fullUrl: string | null;
  uploaderName: string;
}

export interface UsePlacePhotosParams {
  /** `places` id, or `null` while the place is not saved (e.g. a Google place nobody added yet). */
  placeId: string | null;
  /** Saves the place if needed and returns its `places` id (called before the first upload). */
  resolvePlaceId: () => Promise<string>;
}

export interface UsePlacePhotosResult {
  photos: DisplayedPlacePhoto[];
  isLoading: boolean;
  isUploading: boolean;
  /** French message of the last failure, `null` when none. */
  error: string | null;
  /** Picks, compresses and uploads a photo; resolves `true` when one was added. */
  addPhoto: (source: PhotoSource) => Promise<boolean>;
  /** Reports someone else's photo; resolves `true` when it is now hidden. */
  reportPhoto: (photoId: string, reason: PhotoReportReason) => Promise<boolean>;
  /** Deletes one of the current user's photos. */
  deletePhoto: (photo: PlacePhoto) => Promise<void>;
  clearError: () => void;
}

const toMessage = (error: unknown): string =>
  error instanceof ContributionError
    ? error.userMessage
    : new ContributionError('network').userMessage;

const toDisplayed = async (photos: PlacePhoto[]): Promise<DisplayedPlacePhoto[]> => {
  const [urls, names] = await Promise.all([
    placeContributionsService.createPhotoUrls(
      photos.flatMap((photo) => [photo.thumbnailPath, photo.storagePath]),
    ),
    placeContributionsService
      .fetchUploaderNames(photos.map((photo) => photo.uploadedBy))
      .catch((): Record<string, string> => ({})),
  ]);
  return photos.map((photo) => ({
    ...photo,
    thumbnailUrl: urls[photo.thumbnailPath] ?? null,
    fullUrl: urls[photo.storagePath] ?? null,
    uploaderName: names[photo.uploadedBy] ?? UNKNOWN_UPLOADER_NAME,
  }));
};

/**
 * Photos added by Crazer users to a place: list with signed URLs, upload, report, delete.
 *
 * @param params - place id (or `null`) and how to save the place before the first upload
 * @returns the photos and their actions
 */
export function usePlacePhotos({
  placeId,
  resolvePlaceId,
}: UsePlacePhotosParams): UsePlacePhotosResult {
  const [photos, setPhotos] = useState<DisplayedPlacePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(placeId);

  useEffect(() => setSavedPlaceId(placeId), [placeId]);

  useEffect(() => {
    if (!savedPlaceId) {
      setPhotos([]);
      return undefined;
    }
    let isCurrent = true;
    const isCurrentSession = captureUserSession();
    setIsLoading(true);
    placeContributionsService
      .fetchPhotos(savedPlaceId)
      .then(toDisplayed)
      .then((loaded) => {
        if (isCurrent && isCurrentSession()) setPhotos(loaded);
      })
      .catch((err: unknown) => {
        if (isCurrent) setError(toMessage(err));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [savedPlaceId]);

  const addPhoto = useCallback(
    async (source: PhotoSource): Promise<boolean> => {
      setError(null);
      try {
        const picked = await pickPhoto(source);
        if (!picked) return false;
        setIsUploading(true);
        const prepared = await preparePhoto(picked);
        const targetId = savedPlaceId ?? (await resolvePlaceId());
        const saved = await uploadPlacePhoto(targetId, prepared);
        const [displayed] = await toDisplayed([saved]);
        setSavedPlaceId(targetId);
        setPhotos((current) => [displayed, ...current.filter((photo) => photo.id !== saved.id)]);
        return true;
      } catch (err: unknown) {
        setError(toMessage(err));
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [savedPlaceId, resolvePlaceId],
  );

  const reportPhoto = useCallback(
    async (photoId: string, reason: PhotoReportReason): Promise<boolean> => {
      setError(null);
      try {
        const hidden = await placeContributionsService.reportPhoto(photoId, reason);
        if (hidden) setPhotos((current) => current.filter((photo) => photo.id !== photoId));
        return hidden;
      } catch (err: unknown) {
        setError(toMessage(err));
        throw err;
      }
    },
    [],
  );

  const deletePhoto = useCallback(async (photo: PlacePhoto): Promise<void> => {
    setError(null);
    try {
      await placeContributionsService.deletePhoto(photo);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (err: unknown) {
      setError(toMessage(err));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { photos, isLoading, isUploading, error, addPhoto, reportPhoto, deletePhoto, clearError };
}
