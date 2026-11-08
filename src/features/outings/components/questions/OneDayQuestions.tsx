import React from 'react';
import { MultiChipGroup } from '@/shared/components';
import { DAY_PREFERENCE_OPTIONS } from '../../questionOptions';
import { QuestionsFormProps } from './questionProps';

/** Questions of a `one_day` outing: preferences for the day. */
export const OneDayQuestions: React.FC<QuestionsFormProps> = ({ answers, onChange }) => (
  <MultiChipGroup
    label="Tes préférences pour la journée"
    options={DAY_PREFERENCE_OPTIONS}
    values={answers.dayPreferences}
    onChange={(dayPreferences) => onChange({ dayPreferences })}
    testID="question-day-preferences"
  />
);
