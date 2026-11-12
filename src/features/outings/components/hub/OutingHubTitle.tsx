import React, { useEffect, useState } from 'react';
import { AppText, TextField } from '@/shared/components';

export interface OutingHubTitleProps {
  title: string;
  /** Only the organizer renames the outing. */
  editable: boolean;
  /** Saves the new name; resolves with `false` when it was not saved (the field is reset). */
  onRename: (title: string) => Promise<boolean>;
}

/** Name of the outing at the top of the hub, renamed in place by the organizer (saved on blur). */
export const OutingHubTitle: React.FC<OutingHubTitleProps> = ({ title, editable, onRename }) => {
  const [value, setValue] = useState(title);

  useEffect(() => setValue(title), [title]);

  if (!editable) {
    return (
      <AppText variant="h1" testID="hub-title">
        {title}
      </AppText>
    );
  }

  const save = async () => {
    if (value.trim() === title) return;
    const saved = await onRename(value);
    if (!saved) setValue(title);
  };

  return (
    <TextField
      variant="title"
      value={value}
      onChangeText={setValue}
      onBlur={() => void save()}
      onSubmitEditing={() => void save()}
      returnKeyType="done"
      placeholder="Nom de la sortie"
      accessibilityLabel="Nom de la sortie"
      testID="hub-title-input"
    />
  );
};
