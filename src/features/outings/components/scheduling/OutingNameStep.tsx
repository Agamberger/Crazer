import React from 'react';
import { AppText, TextField } from '@/shared/components';

export interface OutingNameStepProps {
  title: string;
  onChangeTitle: (title: string) => void;
}

/** « On sort ! » — name of the outing. */
export const OutingNameStep: React.FC<OutingNameStepProps> = ({ title, onChangeTitle }) => (
  <>
    <AppText variant="h2">On sort !</AppText>
    <AppText color="secondary">Donne un nom à ta sortie.</AppText>
    <TextField
      variant="title"
      placeholder="Ex. Glouglou"
      value={title}
      onChangeText={onChangeTitle}
      maxLength={80}
      accessibilityLabel="Nom de la sortie"
      testID="input-outing-name"
    />
  </>
);
