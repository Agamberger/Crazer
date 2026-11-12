import React, { useEffect, useState } from 'react';
import { AppText, Badge, Button, ChipGroup, InlineAlert, TextField } from '@/shared/components';
import { OUTING_STATUS_CONFIG, OutingRow, OutingStatus } from '@/shared/types';
import { OUTING_STATUS_OPTIONS } from '../../../constants';
import { useOutingsStore } from '../../../store/useOutingsStore';
import { PanelFeedback } from '../../../types/hub';

export interface WhatDetailsSectionProps {
  outing: OutingRow;
  isOrganizer: boolean;
}

/** Description and status of the outing: edited by the organizer, read by the members. */
export const WhatDetailsSection: React.FC<WhatDetailsSectionProps> = ({ outing, isOrganizer }) => {
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const [description, setDescription] = useState(outing.description ?? '');
  const [status, setStatus] = useState<OutingStatus>(outing.status);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);

  useEffect(() => {
    setDescription(outing.description ?? '');
    setStatus(outing.status);
  }, [outing.description, outing.status]);

  if (!isOrganizer) {
    const config = OUTING_STATUS_CONFIG[outing.status];
    return (
      <>
        <Badge label={`${config.emoji} ${config.label}`} />
        <AppText color={outing.description ? 'primary' : 'muted'} testID="what-description">
          {outing.description || 'Pas de description.'}
        </AppText>
      </>
    );
  }

  const trimmed = description.trim();
  const isDirty = trimmed !== (outing.description ?? '') || status !== outing.status;

  const save = async () => {
    setIsSaving(true);
    const updated = await updateOuting(outing.id, {
      description: trimmed ? trimmed : null,
      status,
    });
    setIsSaving(false);
    setFeedback(
      updated
        ? { tone: 'success', message: 'Les détails sont enregistrés.' }
        : { tone: 'error', message: 'Impossible d’enregistrer les détails.' },
    );
  };

  return (
    <>
      <TextField
        label="Description"
        placeholder="Détails du programme, lieu de rendez-vous..."
        value={description}
        onChangeText={(text) => {
          setFeedback(null);
          setDescription(text);
        }}
        multiline
        minHeight={90}
        accessibilityLabel="Description"
        testID="input-what-description"
      />
      <ChipGroup
        label="Statut de la sortie"
        options={OUTING_STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setFeedback(null);
          setStatus(value);
        }}
        testID="what-status"
      />
      {feedback ? (
        <InlineAlert
          tone={feedback.tone}
          message={feedback.message}
          testID="what-details-feedback"
        />
      ) : null}
      <Button
        title="Enregistrer les détails"
        variant="secondary"
        disabled={!isDirty}
        loading={isSaving}
        onPress={() => void save()}
        testID="btn-what-save-details"
      />
    </>
  );
};
