import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, InlineAlert, Loader } from '@/shared/components';
import { useOutingQuestions } from '../../../hooks/useOutingQuestions';
import { OUTING_TYPE_OPTIONS } from '../../../questionOptions';
import { PanelFeedback } from '../../../types/hub';
import { OutingQuestionsFields } from '../../questions/OutingQuestionsFields';
import { OutingTypeStep } from '../../questions/OutingTypeStep';

export interface WhatQuestionsSectionProps {
  outingId: string;
}

/** Type of outing (organizer) and the guided questions of that type, answered by each member. */
export const WhatQuestionsSection: React.FC<WhatQuestionsSectionProps> = ({ outingId }) => {
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);
  const questions = useOutingQuestions(outingId, () =>
    setFeedback({ tone: 'success', message: 'Tes réponses sont enregistrées.' }),
  );

  if (questions.loadFailed) {
    return (
      <InlineAlert
        tone="error"
        message="Impossible de charger les questions. Réessaie plus tard."
      />
    );
  }
  if (!questions.isReady) return <Loader message="Chargement des questions..." />;

  if (!questions.outingType) {
    return questions.isOrganizer ? (
      <OutingTypeStep onSelect={questions.chooseType} disabled={questions.isSaving} />
    ) : (
      <InlineAlert
        tone="info"
        message="L’organisateur n’a pas encore choisi le type de sortie."
        testID="what-waiting-type"
      />
    );
  }

  const type = OUTING_TYPE_OPTIONS.find((option) => option.value === questions.outingType);

  const save = async () => {
    setFeedback(null);
    const result = await questions.submit();
    if (result === 'failed') {
      setFeedback({ tone: 'error', message: 'Impossible d’enregistrer tes réponses.' });
    }
  };

  return (
    <>
      <View style={styles.typeRow}>
        <AppText variant="h3" style={styles.typeLabel} testID="what-type-label">
          {type?.emoji} {type?.label}
        </AppText>
        {questions.isOrganizer ? (
          <Button
            title="Changer"
            variant="ghost"
            size="sm"
            onPress={() => void questions.chooseType(null)}
            testID="btn-what-change-type"
          />
        ) : null}
      </View>
      <OutingQuestionsFields
        outingType={questions.outingType}
        draft={questions.draft}
        onChange={(patch) => {
          setFeedback(null);
          questions.updateDraft(patch);
        }}
        validationError={questions.validationError}
        answeredCount={questions.answeredCount}
        attendingCount={questions.attendingCount}
      />
      {feedback ? (
        <InlineAlert
          tone={feedback.tone}
          message={feedback.message}
          testID="what-answers-feedback"
        />
      ) : null}
      <Button
        title="Enregistrer mes réponses"
        variant="secondary"
        loading={questions.isSaving}
        onPress={() => void save()}
        testID="btn-what-save-answers"
      />
    </>
  );
};

const styles = StyleSheet.create({
  typeLabel: {
    flex: 1,
  },
  typeRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
