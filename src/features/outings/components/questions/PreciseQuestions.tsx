import React from 'react';
import { ChipGroup, TextField } from '@/shared/components';
import {
  ACTIVITY_TYPE_OPTIONS,
  PREFERRED_TIME_OPTIONS,
} from '../../questionOptions';
import { PLACE_WISH_MAX_LENGTH, toggleChoice } from '../../utils/answersUtils';
import { QuestionsFormProps } from './questionProps';
import { YesNoChipGroup } from './YesNoChipGroup';

/** Questions of a `precise` outing: activity, place, time, eat before. */
export const PreciseQuestions: React.FC<QuestionsFormProps> = ({ answers, onChange }) => (
  <>
    <ChipGroup
      label="Quel type d’activité ?"
      options={ACTIVITY_TYPE_OPTIONS}
      value={answers.activityType}
      onChange={(selected) => onChange({ activityType: toggleChoice(answers.activityType, selected) })}
      testID="question-activity"
    />
    <TextField
      label="Un lieu en tête ?"
      placeholder="Ex. Un rooftop vers Bastille"
      value={answers.placeWish}
      onChangeText={(placeWish) => onChange({ placeWish })}
      maxLength={PLACE_WISH_MAX_LENGTH}
      testID="question-place"
    />
    <ChipGroup
      label="À quelle heure ?"
      options={PREFERRED_TIME_OPTIONS}
      value={answers.preferredTime}
      onChange={(selected) => onChange({ preferredTime: toggleChoice(answers.preferredTime, selected) })}
      testID="question-time"
    />
    <YesNoChipGroup
      label="Manger avant ?"
      value={answers.eatBefore}
      onChange={(eatBefore) => onChange({ eatBefore })}
      testID="question-eat-before"
    />
  </>
);
