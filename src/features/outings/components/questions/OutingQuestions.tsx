import React from 'react';
import {
  AppText,
  Button,
  InlineAlert,
  Loader,
  Screen,
  SectionHeader,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingType } from '@/shared/types';
import { useOutingQuestions } from '../../hooks/useOutingQuestions';
import { OUTING_TYPE_LABELS } from '../../questionOptions';
import { QuestionsFormProps } from './questionProps';
import { HolidaysQuestions } from './HolidaysQuestions';
import { OneDayQuestions } from './OneDayQuestions';
import { OutingTypeStep } from './OutingTypeStep';
import { PreciseQuestions } from './PreciseQuestions';

export interface OutingQuestionsProps {
  outingId: string;
  /** Called once the user saved their answers. */
  onDone: () => void;
  onClose: () => void;
}

const CONTENT_STYLE = { gap: spacing.md } as const;

const FORM_BY_TYPE: Record<OutingType, React.FC<QuestionsFormProps>> = {
  precise: PreciseQuestions,
  one_day: OneDayQuestions,
  holidays: HolidaysQuestions,
};

/** Step 4 of the outing journey: type of outing (organizer) then guided questions. */
export const OutingQuestions: React.FC<OutingQuestionsProps> = ({ outingId, onDone, onClose }) => {
  const questions = useOutingQuestions(outingId, onDone);

  if (questions.loadFailed) {
    return (
      <Screen testID="questions-load-failed">
        <InlineAlert
          tone="error"
          message="Impossible de charger les questions. Réessaie plus tard."
        />
        <Button title="Fermer" variant="ghost" fullWidth onPress={onClose} testID="btn-questions-close" />
      </Screen>
    );
  }

  if (!questions.isReady || !questions.outing) {
    return (
      <Screen testID="questions-loading">
        <Loader fullScreen message="Chargement..." />
      </Screen>
    );
  }

  const closeButton = (
    <Button title="Fermer" variant="ghost" fullWidth onPress={onClose} testID="btn-questions-close" />
  );

  if (!questions.outingType) {
    return (
      <Screen scrollable contentStyle={CONTENT_STYLE} footer={closeButton} testID="outing-type-step">
        {questions.isOrganizer ? (
          <OutingTypeStep onSelect={questions.chooseType} disabled={questions.isSaving} />
        ) : (
          <InlineAlert
            tone="info"
            message="L’organisateur n’a pas encore choisi le type de sortie. Reviens un peu plus tard."
            testID="questions-waiting-type"
          />
        )}
      </Screen>
    );
  }

  const Form = FORM_BY_TYPE[questions.outingType];

  return (
    <Screen
      scrollable
      avoidKeyboard
      contentStyle={CONTENT_STYLE}
      footer={
        <>
          <Button
            title="Enregistrer mes réponses"
            fullWidth
            loading={questions.isSaving}
            onPress={questions.submit}
            testID="btn-questions-save"
          />
          {questions.isOrganizer ? (
            <Button
              title="Changer le type de sortie"
              variant="outline"
              fullWidth
              onPress={() => questions.chooseType(null)}
              testID="btn-questions-change-type"
            />
          ) : null}
          {closeButton}
        </>
      }
      testID="outing-questions"
    >
      <AppText variant="h2">{questions.outing.title}</AppText>
      <AppText color="secondary" testID="questions-type-label">
        {OUTING_TYPE_LABELS[questions.outingType]}
      </AppText>
      <Form answers={questions.draft} onChange={questions.updateDraft} />
      {questions.validationError ? (
        <InlineAlert tone="error" message={questions.validationError} testID="questions-error" />
      ) : null}
      <SectionHeader title="Réponses du groupe" />
      <AppText color="secondary" testID="questions-progress">
        {questions.answeredCount} / {questions.attendingCount} ont répondu.
      </AppText>
    </Screen>
  );
};
