import React from 'react';
import { AppText } from '@/shared/components';
import { OUTING_TYPE_OPTIONS } from '../../questionOptions';
import { WhatSummary } from '../../types/hub';

export interface WhatSummaryViewProps {
  summary: WhatSummary | null;
}

const poolLabel = (count: number): string =>
  count === 0
    ? 'Aucune activité dans la pool'
    : `${count} activité${count > 1 ? 's' : ''} dans la pool`;

/** Summary of « Quoi ? »: type, answers progress, the programme's activities and the pool. */
export const WhatSummaryView: React.FC<WhatSummaryViewProps> = ({ summary }) => {
  const type = OUTING_TYPE_OPTIONS.find((option) => option.value === summary?.outingType);
  if (!summary || !type) {
    return (
      <AppText color="secondary" testID="hub-what-empty">
        Type de sortie à choisir
      </AppText>
    );
  }

  return (
    <>
      <AppText weight="semibold" testID="hub-what-type">
        {type.emoji} {type.label}
      </AppText>
      <AppText variant="caption" color="secondary" testID="hub-what-answers">
        {summary.answeredCount}/{summary.attendingCount} ont répondu aux questions
      </AppText>
      <AppText variant="caption" color="secondary" testID="hub-what-activities">
        {summary.placedTitles.length > 0 ? `📅 ${summary.placedTitles.join(', ')} · ` : ''}
        {poolLabel(summary.poolCount)}
      </AppText>
    </>
  );
};
