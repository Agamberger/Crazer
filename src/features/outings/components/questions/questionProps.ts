import { OutingAnswers } from '../../types/questions';

/** Props shared by the question forms of every outing type. */
export interface QuestionsFormProps {
  answers: OutingAnswers;
  onChange: (patch: Partial<OutingAnswers>) => void;
}
