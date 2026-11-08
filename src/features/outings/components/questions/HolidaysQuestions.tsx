import React from 'react';
import { AppText, ChipGroup, MultiChipGroup, MultiDateCalendar } from '@/shared/components';
import { BUDGET_OPTIONS, HOLIDAY_WISH_OPTIONS } from '../../questionOptions';
import { daysFromPeriod, periodFromDays, toggleChoice } from '../../utils/answersUtils';
import { QuestionsFormProps } from './questionProps';

/** Questions of a `holidays` outing: period (first and last day), budget, wishes. */
export const HolidaysQuestions: React.FC<QuestionsFormProps> = ({ answers, onChange }) => (
  <>
    <AppText variant="label">Sur quelle période ? Choisis le premier et le dernier jour.</AppText>
    <MultiDateCalendar
      values={daysFromPeriod(answers)}
      onChange={(days) => onChange(periodFromDays(days))}
      minDate={new Date()}
      testID="question-period"
    />
    <ChipGroup
      label="Quel budget ?"
      options={BUDGET_OPTIONS}
      value={answers.budget}
      onChange={(selected) => onChange({ budget: toggleChoice(answers.budget, selected) })}
      testID="question-budget"
    />
    <MultiChipGroup
      label="Tes envies"
      options={HOLIDAY_WISH_OPTIONS}
      values={answers.wishes}
      onChange={(wishes) => onChange({ wishes })}
      testID="question-wishes"
    />
  </>
);
