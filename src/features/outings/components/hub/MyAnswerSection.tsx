import React from 'react';
import { ChipGroup, ChipOption, InlineAlert } from '@/shared/components';
import { ParticipantStatus } from '@/shared/types';
import { InvitationResponse } from '../../store/useOutingSchedulingStore';
import { PanelFeedback } from '../../types/hub';

export interface MyAnswerSectionProps {
  myStatus: ParticipantStatus;
  onAnswer: (response: InvitationResponse) => void;
  disabled: boolean;
  feedback: PanelFeedback | null;
}

const ANSWER_OPTIONS: ReadonlyArray<ChipOption<InvitationResponse>> = [
  { value: 'accepted', label: 'Je viens', emoji: '✅' },
  { value: 'maybe', label: 'Peut-être', emoji: '🤔' },
  { value: 'declined', label: 'Je ne viens pas', emoji: '❌' },
];

/** « Ma réponse »: a member answers the invitation or changes their answer. */
export const MyAnswerSection: React.FC<MyAnswerSectionProps> = ({
  myStatus,
  onAnswer,
  disabled,
  feedback,
}) => (
  <>
    {myStatus === 'invited' ? (
      <InlineAlert tone="info" message="Tu es invité·e : tu viens ?" testID="my-answer-pending" />
    ) : null}
    <ChipGroup
      label="Ma réponse"
      options={ANSWER_OPTIONS}
      value={myStatus === 'invited' ? null : myStatus}
      onChange={onAnswer}
      disabled={disabled}
      testID="my-answer"
    />
    {feedback ? (
      <InlineAlert tone={feedback.tone} message={feedback.message} testID="my-answer-feedback" />
    ) : null}
  </>
);
