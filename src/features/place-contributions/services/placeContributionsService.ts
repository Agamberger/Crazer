import { supabase } from '@/shared/lib/supabase';
import { PlaceHoursProposalRow, PlacePhotoRow, PlaceReviewRow } from '@/shared/types';
import {
  OpeningPeriod,
  PhotoReportReason,
  PlaceContributionSummary,
  PlaceHoursProposal,
  PlacePhoto,
  PlaceReview,
  PlaceReviewInput,
} from '../types/contributions';
import {
  areValidOpeningPeriods,
  parseOpeningPeriods,
  toOpeningPeriodsJson,
} from '../utils/openingPeriods';
import { ContributionError, toContributionError } from './contributionError';

/** Private Storage bucket of the photos added by users. */
export const PLACE_PHOTOS_BUCKET = 'place-photos';
/** Lifetime of a signed photo URL (s). */
export const PHOTO_URL_TTL_S = 60 * 60;
/** Maximum number of places per summary request (same cap as the RPC). */
export const MAX_SUMMARY_PLACES = 100;
const MAX_COMMENT_LENGTH = 500;

const toPhoto = (row: PlacePhotoRow): PlacePhoto => ({
  id: row.id,
  placeId: row.place_id,
  uploadedBy: row.uploaded_by,
  storagePath: row.storage_path,
  thumbnailPath: row.thumbnail_path,
  width: row.width,
  height: row.height,
  isHidden: row.is_hidden,
  createdAt: row.created_at,
});

const toProposal = (row: PlaceHoursProposalRow): PlaceHoursProposal => ({
  id: row.id,
  placeId: row.place_id,
  proposedBy: row.proposed_by,
  periods: parseOpeningPeriods(row.periods),
  status: row.status,
  yesCount: row.yes_count,
  noCount: row.no_count,
  updatedAt: row.updated_at,
});

const toReview = (row: PlaceReviewRow): PlaceReview => ({
  id: row.id,
  placeId: row.place_id,
  authorId: row.author_id,
  rating: row.rating,
  comment: row.comment,
  updatedAt: row.updated_at,
});

const normalizeComment = (comment: string | null): string | null => {
  const trimmed = comment?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const assertValidReview = (input: PlaceReviewInput): void => {
  const comment = normalizeComment(input.comment);
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ContributionError('invalid', 'rating must be an integer between 1 and 5');
  }
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    throw new ContributionError('invalid', 'comment longer than 500 characters');
  }
};

/** Data access for the contributions of Crazer users on places. */
export const placeContributionsService = {
  /**
   * What users already provide for several places (completeness score).
   *
   * @param placeIds - `places` ids (duplicates ignored, at most 100 kept)
   * @returns one summary per visible place
   * @throws ContributionError on failure
   */
  async fetchSummaries(placeIds: readonly string[]): Promise<PlaceContributionSummary[]> {
    const ids = Array.from(new Set(placeIds)).slice(0, MAX_SUMMARY_PLACES);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.rpc('get_place_contribution_summaries', {
      p_place_ids: ids,
    });
    if (error) throw toContributionError(error);
    return (data ?? []).map((row) => ({
      placeId: row.place_id,
      photoCount: row.photo_count,
      reviewCount: row.review_count,
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
      confirmedHours:
        row.confirmed_hours === null ? null : parseOpeningPeriods(row.confirmed_hours),
    }));
  },

  /**
   * `places` row of a Google place already saved by someone, if any.
   *
   * @param googlePlaceId - Google place ID
   * @returns the row id, or `null` when nobody saved this place yet
   * @throws ContributionError on failure
   */
  async findPlaceIdByGooglePlaceId(googlePlaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('places')
      .select('id')
      .eq('source', 'google')
      .eq('source_id', googlePlaceId)
      .maybeSingle();
    if (error) throw toContributionError(error);
    return data?.id ?? null;
  },

  /**
   * Photos of a place, newest first (hidden ones only for their uploader).
   *
   * @param placeId - `places` id
   * @returns the photos
   * @throws ContributionError on failure
   */
  async fetchPhotos(placeId: string): Promise<PlacePhoto[]> {
    const { data, error } = await supabase
      .from('place_photos')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
    if (error) throw toContributionError(error);
    return (data ?? []).map(toPhoto);
  },

  /**
   * Signed display URLs of files of the private bucket.
   *
   * @param paths - Storage paths (photos or thumbnails)
   * @returns URL per path; paths that could not be signed are missing
   * @throws ContributionError on failure
   */
  async createPhotoUrls(paths: readonly string[]): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await supabase.storage
      .from(PLACE_PHOTOS_BUCKET)
      .createSignedUrls([...paths], PHOTO_URL_TTL_S);
    if (error) throw toContributionError(error);
    return Object.fromEntries(
      (data ?? []).flatMap((entry) =>
        entry.path && entry.signedUrl && !entry.error ? [[entry.path, entry.signedUrl]] : [],
      ),
    );
  },

  /**
   * Display names of photo uploaders, for their credit under the photo.
   *
   * @param userIds - user ids (duplicates ignored)
   * @returns name per user id; users without a name are missing
   * @throws ContributionError on failure
   */
  async fetchUploaderNames(userIds: readonly string[]): Promise<Record<string, string>> {
    const ids = Array.from(new Set(userIds));
    if (ids.length === 0) return {};
    const { data, error } = await supabase.rpc('get_profiles', { p_ids: ids });
    if (error) throw toContributionError(error);
    return Object.fromEntries(
      (data ?? []).flatMap((profile) => {
        const name = profile.full_name?.trim();
        return name ? [[profile.id, name]] : [];
      }),
    );
  },

  /**
   * Registers a photo whose file and thumbnail are already uploaded.
   *
   * @param placeId - `places` id
   * @param photoId - UUID used in both file names
   * @param width - width of the full-size file (px)
   * @param height - height of the full-size file (px)
   * @returns the saved photo
   * @throws ContributionError (`quota_reached` beyond 10 photos/day or 20 per place)
   */
  async registerPhoto(
    placeId: string,
    photoId: string,
    width: number,
    height: number,
  ): Promise<PlacePhoto> {
    const { data, error } = await supabase.rpc('add_place_photo', {
      p_place_id: placeId,
      p_photo_id: photoId,
      p_width: width,
      p_height: height,
    });
    if (error) throw toContributionError(error);
    return toPhoto(data);
  },

  /**
   * Reports someone else's photo (hidden from the third report).
   *
   * @param photoId - photo id
   * @param reason - reason of the report
   * @returns `true` when the photo is now hidden
   * @throws ContributionError on failure (own photo: `invalid`)
   */
  async reportPhoto(photoId: string, reason: PhotoReportReason): Promise<boolean> {
    const { data, error } = await supabase.rpc('report_place_photo', {
      p_photo_id: photoId,
      p_reason: reason,
    });
    if (error) throw toContributionError(error);
    return data;
  },

  /**
   * Deletes one of the current user's photos, then its files.
   *
   * @param photo - photo to delete
   * @throws ContributionError when the row cannot be deleted
   */
  async deletePhoto(photo: PlacePhoto): Promise<void> {
    const { error } = await supabase.rpc('delete_place_photo', { p_photo_id: photo.id });
    if (error) throw toContributionError(error);
    const { error: storageError } = await supabase.storage
      .from(PLACE_PHOTOS_BUCKET)
      .remove([photo.storagePath, photo.thumbnailPath]);
    if (storageError) {
      console.warn('[placeContributionsService] Files left after deleting a photo', storageError);
    }
  },

  /**
   * Opening hours proposals of a place: pending ones and the latest confirmed one.
   *
   * @param placeId - `places` id
   * @returns proposals, most recently updated first
   * @throws ContributionError on failure
   */
  async fetchHoursProposals(placeId: string): Promise<PlaceHoursProposal[]> {
    const { data, error } = await supabase
      .from('place_hours_proposals')
      .select('*')
      .eq('place_id', placeId)
      .in('status', ['pending', 'confirmed'])
      .order('updated_at', { ascending: false });
    if (error) throw toContributionError(error);
    const proposals = (data ?? []).map(toProposal);
    const latestConfirmed = proposals.find((proposal) => proposal.status === 'confirmed');
    return proposals.filter(
      (proposal) => proposal.status === 'pending' || proposal === latestConfirmed,
    );
  },

  /**
   * The current user's votes on some proposals.
   *
   * @param proposalIds - proposal ids
   * @returns `isCorrect` per voted proposal
   * @throws ContributionError on failure
   */
  async fetchMyHoursVotes(proposalIds: readonly string[]): Promise<Record<string, boolean>> {
    if (proposalIds.length === 0) return {};
    const { data, error } = await supabase
      .from('place_hours_votes')
      .select('proposal_id, is_correct')
      .in('proposal_id', [...proposalIds]);
    if (error) throw toContributionError(error);
    return Object.fromEntries((data ?? []).map((row) => [row.proposal_id, row.is_correct]));
  },

  /**
   * Proposes the weekly opening hours of a place (replaces the user's pending proposal).
   *
   * @param placeId - `places` id
   * @param periods - opening periods; a day without period is closed
   * @returns the new proposal
   * @throws ContributionError (`invalid` for invalid periods, checked before sending)
   */
  async proposeHours(
    placeId: string,
    periods: readonly OpeningPeriod[],
  ): Promise<PlaceHoursProposal> {
    if (!areValidOpeningPeriods(periods)) {
      throw new ContributionError('invalid', 'invalid opening periods');
    }
    const { data, error } = await supabase.rpc('propose_place_hours', {
      p_place_id: placeId,
      p_periods: toOpeningPeriodsJson(periods),
    });
    if (error) throw toContributionError(error);
    return toProposal(data);
  },

  /**
   * Answers « C'est juste ? » for someone else's proposal (a new vote replaces the previous one).
   *
   * @param proposalId - proposal id
   * @param isCorrect - `true` for « Oui », `false` for « Non »
   * @returns the proposal with its new counts and status
   * @throws ContributionError on failure (own proposal: `invalid`)
   */
  async voteHours(proposalId: string, isCorrect: boolean): Promise<PlaceHoursProposal> {
    const { data, error } = await supabase.rpc('vote_place_hours', {
      p_proposal_id: proposalId,
      p_is_correct: isCorrect,
    });
    if (error) throw toContributionError(error);
    return toProposal(data);
  },

  /**
   * Reviews of a place, most recent first.
   *
   * @param placeId - `places` id
   * @returns the reviews
   * @throws ContributionError on failure
   */
  async fetchReviews(placeId: string): Promise<PlaceReview[]> {
    const { data, error } = await supabase
      .from('place_reviews')
      .select('*')
      .eq('place_id', placeId)
      .order('updated_at', { ascending: false });
    if (error) throw toContributionError(error);
    return (data ?? []).map(toReview);
  },

  /**
   * Creates or updates the current user's review of a place.
   *
   * @param input - place, rating (1–5) and optional comment (≤ 500 characters)
   * @param userId - id of the current user
   * @returns the saved review
   * @throws ContributionError (`invalid` for a bad rating or comment, checked before sending)
   */
  async saveMyReview(input: PlaceReviewInput, userId: string): Promise<PlaceReview> {
    assertValidReview(input);
    const comment = normalizeComment(input.comment);
    const { data: existing, error: readError } = await supabase
      .from('place_reviews')
      .select('id')
      .eq('place_id', input.placeId)
      .eq('author_id', userId)
      .maybeSingle();
    if (readError) throw toContributionError(readError);

    const { data, error } = existing
      ? await supabase
          .from('place_reviews')
          .update({ rating: input.rating, comment })
          .eq('id', existing.id)
          .select('*')
          .single()
      : await supabase
          .from('place_reviews')
          .insert({ place_id: input.placeId, author_id: userId, rating: input.rating, comment })
          .select('*')
          .single();
    if (error) throw toContributionError(error);
    return toReview(data);
  },

  /**
   * Deletes the current user's review of a place.
   *
   * @param placeId - `places` id
   * @param userId - id of the current user
   * @throws ContributionError on failure
   */
  async deleteMyReview(placeId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('place_reviews')
      .delete()
      .eq('place_id', placeId)
      .eq('author_id', userId);
    if (error) throw toContributionError(error);
  },
};
