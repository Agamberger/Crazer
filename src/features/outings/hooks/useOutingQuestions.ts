import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { OutingType } from '@/shared/types';
import { outingAnswersService } from '../services/outingAnswersService';
import { useOutingsStore } from '../store/useOutingsStore';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { OutingAnswers } from '../types/questions';
import { EMPTY_ANSWERS, hasAnswersFor, validateAnswers } from '../utils/answersUtils';

/**
 * State of the guided-questions step: the outing type (chosen by the organizer),
 * the current user's draft answers and the group's progress.
 */
export const useOutingQuestions = (outingId: string, onDone: () => void) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const outing = useOutingsStore((state) => state.outings.find((o) => o.id === outingId) ?? null);
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const answersByOutingId = useOutingAnswersStore((state) => state.answersByOutingId);
  const isLoading = useOutingAnswersStore((state) => state.isLoading);
  const isSaving = useOutingAnswersStore((state) => state.isSaving);
  const fetchAnswers = useOutingAnswersStore((state) => state.fetchAnswers);
  const saveMyAnswers = useOutingAnswersStore((state) => state.saveMyAnswers);
  const setOutingType = useOutingAnswersStore((state) => state.setOutingType);

  const [draft, setDraft] = useState<OutingAnswers>(EMPTY_ANSWERS);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attendingIds, setAttendingIds] = useState<ReadonlyArray<string>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const groupAnswers = useMemo(() => answersByOutingId[outingId] ?? [], [answersByOutingId, outingId]);
  const isOrganizer = !!userId && outing?.created_by === userId;
  const outingType = outing?.outing_type ?? null;

  useEffect(() => {
    if (!outing) void fetchOutingById(outingId);
  }, [outing, outingId, fetchOutingById]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [answers, attending] = await Promise.all([
        fetchAnswers(outingId),
        outingAnswersService.fetchAttendingUserIds(outingId).catch(() => null),
      ]);
      if (cancelled) return;
      if (!answers || !attending) {
        setLoadFailed(true);
        return;
      }
      const mine = answers.find((a) => a.userId === userId);
      if (mine) setDraft(mine);
      setAttendingIds(attending);
      setLoadFailed(false);
      setIsDraftLoaded(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [outingId, userId, fetchAnswers]);

  const updateDraft = useCallback((patch: Partial<OutingAnswers>) => {
    setValidationError(null);
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const chooseType = useCallback(
    async (type: OutingType | null) => {
      try {
        await setOutingType(outingId, type);
      } catch {
        toast.error('Impossible de choisir le type de sortie.', { title: 'Erreur' });
      }
    },
    [outingId, setOutingType],
  );

  const submit = useCallback(async () => {
    if (!outingType || !userId) return;
    const problem = validateAnswers(outingType, draft);
    if (problem) {
      setValidationError(problem);
      return;
    }
    try {
      await saveMyAnswers(outingId, userId, draft);
      toast.success('Tes réponses sont enregistrées.');
      onDone();
    } catch {
      toast.error('Impossible d’enregistrer tes réponses.', { title: 'Erreur' });
    }
  }, [outingType, userId, draft, saveMyAnswers, outingId, onDone]);

  const answeredCount = outingType
    ? groupAnswers.filter((a) => attendingIds.includes(a.userId) && hasAnswersFor(outingType, a)).length
    : 0;

  return {
    outing,
    outingType,
    isOrganizer,
    draft,
    updateDraft,
    validationError,
    answeredCount,
    attendingCount: attendingIds.length,
    loadFailed,
    isReady: !!outing && isDraftLoaded && !isLoading,
    isSaving,
    chooseType,
    submit,
  };
};
