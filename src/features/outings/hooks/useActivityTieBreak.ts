import { useCallback, useState } from 'react';
import { toast } from '@/shared/store/useToastStore';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { ActivityResult } from '../types/activities';
import { DayKey } from '../types/scheduling';
import { buildDrawSequence } from '../utils/activityUtils';
import { useActivityVotes } from './useActivityVotes';

/** Number of full passes over the candidates before the roulette stops. */
const DRAW_LOOPS = 3;

export interface DrawState {
  candidates: ActivityResult[];
  sequence: number[];
  winnerId: string;
}

/**
 * State of the tie-break screen of one day group. The organizer settles a tie either by
 * hand or by a random draw; the draw is animated from the candidates frozen when it starts,
 * because the realtime refresh already marks the winner as chosen.
 */
export const useActivityTieBreak = (outingId: string | undefined, day: DayKey | null) => {
  const votes = useActivityVotes(outingId);
  const drawActivity = useActivityVotesStore((state) => state.drawActivity);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const group = votes.groups.find((g) => g.day === day) ?? null;

  const startDraw = useCallback(async () => {
    if (!outingId || !group || isDrawing || group.tiedResults.length < 2) return;
    const candidates = group.tiedResults;
    setIsDrawing(true);
    try {
      const winnerId = await drawActivity(outingId, day);
      const winnerIndex = Math.max(
        candidates.findIndex((c) => c.activity.id === winnerId),
        0,
      );
      setIsRevealed(false);
      setDraw({
        candidates,
        winnerId,
        sequence: buildDrawSequence(candidates.length, winnerIndex, DRAW_LOOPS),
      });
    } catch {
      toast.error('Impossible de tirer au sort.', { title: 'Erreur' });
    } finally {
      setIsDrawing(false);
    }
  }, [outingId, group, day, isDrawing, drawActivity]);

  const finishDraw = useCallback(() => setIsRevealed(true), []);

  return { ...votes, group, draw, isRevealed, isDrawing, startDraw, finishDraw };
};
