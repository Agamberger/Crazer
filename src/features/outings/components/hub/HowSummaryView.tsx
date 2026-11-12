import React from 'react';
import { AppText } from '@/shared/components';
import { OUTING_TYPE_OPTIONS } from '../../questionOptions';
import { HowSummary } from '../../types/hub';

export interface HowSummaryViewProps {
  summary: HowSummary | null;
}

const proposalsLabel = (count: number): string =>
  count === 0
    ? 'Aucune activité proposée'
    : `${count} activité${count > 1 ? 's' : ''} proposée${count > 1 ? 's' : ''}`;

/** Summary of « Comment ? »: type, answers progress and activities (retained ones first). */
export const HowSummaryView: React.FC<HowSummaryViewProps> = ({ summary }) => {
  const type = OUTING_TYPE_OPTIONS.find((option) => option.value === summary?.outingType);
  if (!summary || !type) {
    return (
      <AppText color="secondary" testID="hub-how-empty">
        Type de sortie à choisir
      </AppText>
    );
  }

  return (
    <>
      <AppText weight="semibold" testID="hub-how-type">
        {type.emoji} {type.label}
      </AppText>
      <AppText variant="caption" color="secondary" testID="hub-how-answers">
        {summary.answeredCount}/{summary.attendingCount} ont répondu aux questions
      </AppText>
      <AppText variant="caption" color="secondary" testID="hub-how-activities">
        {summary.chosenTitles.length > 0
          ? `✅ ${summary.chosenTitles.join(', ')}`
          : proposalsLabel(summary.proposalCount)}
      </AppText>
    </>
  );
};
