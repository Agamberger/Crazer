import React from 'react';
import { AppText, Button, InlineAlert, Loader, Screen } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useOutingQuestions } from '../../hooks/useOutingQuestions';
import { OUTING_TYPE_LABELS } from '../../questionOptions';
import { OutingQuestionsFields } from './OutingQuestionsFields';
import { OutingTypeStep } from './OutingTypeStep';

export interface OutingQuestionsProps {
  outingId: string;
  /** Called once the user saved their answers. */
  onDone: () => void;
  onClose: () => void;
}

const CONTENT_STYLE = { gap: spacing.md } as const;

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
        <Button
          title="Fermer"
          variant="ghost"
          fullWidth
          onPress={onClose}
          testID="btn-questions-close"
        />
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
    <Button
      title="Fermer"
      variant="ghost"
      fullWidth
      onPress={onClose}
      testID="btn-questions-close"
    />
  );

  if (!questions.outingType) {
    return (
      <Screen
        scrollable
        contentStyle={CONTENT_STYLE}
        footer={closeButton}
        testID="outing-type-step"
      >
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
            onPress={() => void questions.submit()}
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
      <OutingQuestionsFields
        outingType={questions.outingType}
        draft={questions.draft}
        onChange={questions.updateDraft}
        validationError={questions.validationError}
        answeredCount={questions.answeredCount}
        attendingCount={questions.attendingCount}
      />
    </Screen>
  );
};
