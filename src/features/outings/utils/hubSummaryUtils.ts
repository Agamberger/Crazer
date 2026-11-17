import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { OutingActivities } from '../types/activities';
import { WhatSummary, WhenSummary } from '../types/hub';
import { MemberAnswers } from '../types/questions';
import { DayRecap, OutingMember } from '../types/scheduling';
import { hasAnswersFor } from './answersUtils';
import { attendingMembers } from './availabilityUtils';

/** `2026-11-15T13:00:00Z` → « sam. 15 nov. · 14:00 » (local time). */
export const formatOutingDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
};

/**
 * Summary of the « Quand ? » section.
 * @param outing the outing (its `start_date` wins once a day is chosen).
 * @param recaps live recap of each candidate day.
 * @returns the chosen date, else the candidate days, else `empty`.
 */
export const summarizeWhen = (
  outing: Pick<OutingRow, 'start_date'>,
  recaps: ReadonlyArray<DayRecap>,
): WhenSummary => {
  if (outing.start_date) return { kind: 'date', label: formatOutingDate(outing.start_date) };
  if (recaps.length === 0) return { kind: 'empty' };
  return {
    kind: 'days',
    days: recaps.map((recap) => recap.day),
    daysWithCommonSlot: recaps.filter((recap) => recap.commonSlot !== null).length,
  };
};

/**
 * Summary of the « Quoi ? » section.
 * @param outing the outing (its type).
 * @param members participants of the outing (attendees answer the questions).
 * @param answers saved answers of the group.
 * @param activities activities of the pool, `null` while not loaded.
 * @param steps steps of the outing (an activity linked by a step is in the programme).
 * @returns type, answers progress, size of the pool and activities placed in the programme.
 */
export const summarizeWhat = (
  outing: Pick<OutingRow, 'outing_type'>,
  members: ReadonlyArray<OutingMember>,
  answers: ReadonlyArray<MemberAnswers>,
  activities: OutingActivities | null,
  steps: ReadonlyArray<Pick<PlannedOutingRow, 'activity_id' | 'status'>>,
): WhatSummary => {
  const outingType = outing.outing_type ?? null;
  const attendingIds = new Set(attendingMembers(members).map((member) => member.userId));
  const answeredCount = outingType
    ? answers.filter((a) => attendingIds.has(a.userId) && hasAnswersFor(outingType, a)).length
    : 0;
  const proposals = activities?.activities ?? [];
  const placedIds = new Set(
    steps.filter((step) => step.status !== 'cancelled').map((step) => step.activity_id),
  );
  const placed = proposals.filter((activity) => placedIds.has(activity.id));

  return {
    outingType,
    answeredCount,
    attendingCount: attendingIds.size,
    poolCount: proposals.length - placed.length,
    placedTitles: placed.map((activity) => activity.title),
  };
};
