import { PlaceHoursStatus } from '@/shared/types';

/** Day of the week, 0 = Monday … 6 = Sunday. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One opening period; `close` before `open` means it ends after midnight. */
export interface OpeningPeriod {
  day: WeekDay;
  /** « HH:MM », 00:00–23:59. */
  open: string;
  close: string;
}

/** Why a photo is reported (mirror of the SQL check). */
export type PhotoReportReason = 'inappropriate' | 'wrong_place' | 'spam' | 'other';

/** A photo added by a Crazer user (never a Google photo). */
export interface PlacePhoto {
  id: string;
  placeId: string;
  uploadedBy: string;
  storagePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  /** Hidden after 3 reports: only its uploader still sees it. */
  isHidden: boolean;
  createdAt: string;
}

/** Weekly opening hours proposed by a user and checked by the others. */
export interface PlaceHoursProposal {
  id: string;
  placeId: string;
  proposedBy: string;
  periods: OpeningPeriod[];
  status: PlaceHoursStatus;
  yesCount: number;
  noCount: number;
  updatedAt: string;
}

/** A Crazer review: 1–5 stars and an optional comment. */
export interface PlaceReview {
  id: string;
  placeId: string;
  authorId: string;
  rating: number;
  comment: string | null;
  updatedAt: string;
}

/** What Crazer users already provide for a place (completeness score). */
export interface PlaceContributionSummary {
  placeId: string;
  photoCount: number;
  reviewCount: number;
  /** `null` without review. */
  averageRating: number | null;
  /** Latest confirmed hours, `null` when none. */
  confirmedHours: OpeningPeriod[] | null;
}

/** Input of a review written by the current user. */
export interface PlaceReviewInput {
  placeId: string;
  rating: number;
  comment: string | null;
}
