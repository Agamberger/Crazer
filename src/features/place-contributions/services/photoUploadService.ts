import { supabase } from '@/shared/lib/supabase';
import { createUuidV4 } from '@/shared/utils/uuid';
import { PlacePhoto } from '../types/contributions';
import { ContributionError, toContributionError } from './contributionError';
import { PreparedPhoto } from './photoProcessing';
import { PLACE_PHOTOS_BUCKET, placeContributionsService } from './placeContributionsService';

/** Storage paths of a photo, the format required by the bucket policies. */
export function photoStoragePaths(
  placeId: string,
  photoId: string,
): { full: string; thumbnail: string } {
  return { full: `${placeId}/${photoId}.jpg`, thumbnail: `${placeId}/${photoId}_thumb.jpg` };
}

const readFileBytes = async (uri: string): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(uri);
    return await response.arrayBuffer();
  } catch (error: unknown) {
    throw new ContributionError(
      'invalid',
      error instanceof Error ? error.message : 'unreadable file',
    );
  }
};

const uploadFile = async (path: string, uri: string): Promise<void> => {
  const bytes = await readFileBytes(uri);
  const { error } = await supabase.storage
    .from(PLACE_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) {
    // Storage refuses an upload beyond the daily quota through its RLS policy.
    throw new ContributionError(
      /row-level security|policy/i.test(error.message) ? 'quota_reached' : 'network',
      error.message,
    );
  }
};

const removeFiles = async (paths: string[]): Promise<void> => {
  const { error } = await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(paths);
  if (error) console.warn('[photoUploadService] Files left after a failed upload', error);
};

/**
 * Uploads a prepared photo and its thumbnail, then registers it. Files are removed again when
 * the registration fails (quota, place deleted…).
 *
 * @param placeId - `places` id
 * @param photo - files built by `preparePhoto`
 * @returns the saved photo
 * @throws ContributionError on failure (`quota_reached` beyond the limits)
 */
export async function uploadPlacePhoto(placeId: string, photo: PreparedPhoto): Promise<PlacePhoto> {
  const photoId = createUuidV4();
  const paths = photoStoragePaths(placeId, photoId);
  const uploaded: string[] = [];
  try {
    await uploadFile(paths.full, photo.full.uri);
    uploaded.push(paths.full);
    await uploadFile(paths.thumbnail, photo.thumbnail.uri);
    uploaded.push(paths.thumbnail);
    return await placeContributionsService.registerPhoto(
      placeId,
      photoId,
      photo.full.width,
      photo.full.height,
    );
  } catch (error: unknown) {
    if (uploaded.length > 0) await removeFiles(uploaded);
    if (error instanceof ContributionError) throw error;
    throw toContributionError({
      message: error instanceof Error ? error.message : 'upload failed',
    });
  }
}
