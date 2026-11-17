import React from 'react';
import { AppText, InlineAlert, SectionHeader } from '@/shared/components';
import { OutingType } from '@/shared/types';
import { OutingAnswers } from '../../types/questions';
import { HolidaysQuestions } from './HolidaysQuestions';
import { OneDayQuestions } from './OneDayQuestions';
import { PreciseQuestions } from './PreciseQuestions';
import { QuestionsFormProps } from './questionProps';

export interface OutingQuestionsFieldsProps {
  outingType: OutingType;
  draft: OutingAnswers;
  onChange: (patch: Partial<OutingAnswers>) => void;
  validationError: string | null;
  answeredCount: number;
  attendingCount: number;
}

const FORM_BY_TYPE: Record<OutingType, React.FC<QuestionsFormProps>> = {
  precise: PreciseQuestions,
  one_day: OneDayQuestions,
  holidays: HolidaysQuestions,
};

/**
 * The guided questions of an outing type, my answers and the group progress
 * (shared by the questions screen and the « Quoi ? » panel of the hub).
 */
export const OutingQuestionsFields: React.FC<OutingQuestionsFieldsProps> = ({
  outingType,
  draft,
  onChange,
  validationError,
  answeredCount,
  attendingCount,
}) => {
  const Form = FORM_BY_TYPE[outingType];
  return (
    <>
      <Form answers={draft} onChange={onChange} />
      {validationError ? (
        <InlineAlert tone="error" message={validationError} testID="questions-error" />
      ) : null}
      <SectionHeader title="Réponses du groupe" />
      <AppText color="secondary" testID="questions-progress">
        {answeredCount} / {attendingCount} ont répondu.
      </AppText>
    </>
  );
};
