import { useCallback, useEffect, useMemo, useState } from 'react';
import { captureUserSession } from '@/shared/store/sessionReset';
import { ContributionError } from '../services/contributionError';
import { placeContributionsService } from '../services/placeContributionsService';
import { OpeningPeriod, PlaceHoursProposal } from '../types/contributions';

export interface UsePlaceHoursParams {
  /** `places` id, or `null` while the place is not saved yet. */
  placeId: string | null;
  /** Saves the place if needed and returns its `places` id (before the first proposal). */
  resolvePlaceId: () => Promise<string>;
  /** Current user, to tell their own proposal from the others'. */
  userId: string | null;
}

export interface UsePlaceHoursResult {
  /** Latest hours confirmed by the community, `null` when none. */
  confirmed: PlaceHoursProposal | null;
  /** Most recent pending proposal of someone else, to confirm or not. */
  toReview: PlaceHoursProposal | null;
  /** The current user's pending proposal, if any. */
  myPending: PlaceHoursProposal | null;
  /** The current user's vote on `toReview` (`true` = « Oui »), `null` when not voted. */
  myVote: boolean | null;
  isLoading: boolean;
  isSaving: boolean;
  /** French message of the last failure, `null` when none. */
  error: string | null;
  /** Proposes the hours of the week; resolves `true` on success. */
  propose: (periods: readonly OpeningPeriod[]) => Promise<boolean>;
  /** Answers « C'est juste ? » on `toReview`. */
  vote: (isCorrect: boolean) => Promise<void>;
  clearError: () => void;
}

const toMessage = (error: unknown): string =>
  error instanceof ContributionError
    ? error.userMessage
    : new ContributionError('network').userMessage;

/**
 * Opening hours contributed by Crazer users for a place: confirmed hours, a proposal to
 * check, the user's own proposal, and the actions to propose and vote.
 *
 * @param params - place id (or `null`), how to save the place, current user
 * @returns the hours state and its actions
 */
export function usePlaceHours({
  placeId,
  resolvePlaceId,
  userId,
}: UsePlaceHoursParams): UsePlaceHoursResult {
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(placeId);
  const [proposals, setProposals] = useState<PlaceHoursProposal[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSavedPlaceId(placeId), [placeId]);

  const load = useCallback(async (id: string): Promise<void> => {
    const loaded = await placeContributionsService.fetchHoursProposals(id);
    const votes = await placeContributionsService.fetchMyHoursVotes(loaded.map((p) => p.id));
    setProposals(loaded);
    setMyVotes(votes);
  }, []);

  useEffect(() => {
    if (!savedPlaceId) {
      setProposals([]);
      return undefined;
    }
    let isCurrent = true;
    const isCurrentSession = captureUserSession();
    setIsLoading(true);
    placeContributionsService
      .fetchHoursProposals(savedPlaceId)
      .then(async (loaded) => {
        const votes = await placeContributionsService.fetchMyHoursVotes(loaded.map((p) => p.id));
        if (!isCurrent || !isCurrentSession()) return;
        setProposals(loaded);
        setMyVotes(votes);
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

  const confirmed = useMemo(
    () => proposals.find((proposal) => proposal.status === 'confirmed') ?? null,
    [proposals],
  );
  const myPending = useMemo(
    () =>
      proposals.find(
        (proposal) => proposal.status === 'pending' && proposal.proposedBy === userId,
      ) ?? null,
    [proposals, userId],
  );
  const toReview = useMemo(
    () =>
      proposals.find(
        (proposal) => proposal.status === 'pending' && proposal.proposedBy !== userId,
      ) ?? null,
    [proposals, userId],
  );

  const propose = useCallback(
    async (periods: readonly OpeningPeriod[]): Promise<boolean> => {
      setError(null);
      setIsSaving(true);
      try {
        const targetId = savedPlaceId ?? (await resolvePlaceId());
        await placeContributionsService.proposeHours(targetId, periods);
        setSavedPlaceId(targetId);
        await load(targetId);
        return true;
      } catch (err: unknown) {
        setError(toMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [savedPlaceId, resolvePlaceId, load],
  );

  const vote = useCallback(
    async (isCorrect: boolean): Promise<void> => {
      if (!toReview || !savedPlaceId) return;
      setError(null);
      setIsSaving(true);
      try {
        await placeContributionsService.voteHours(toReview.id, isCorrect);
        await load(savedPlaceId);
      } catch (err: unknown) {
        setError(toMessage(err));
      } finally {
        setIsSaving(false);
      }
    },
    [toReview, savedPlaceId, load],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    confirmed,
    toReview,
    myPending,
    myVote: toReview ? (myVotes[toReview.id] ?? null) : null,
    isLoading,
    isSaving,
    error,
    propose,
    vote,
    clearError,
  };
}
