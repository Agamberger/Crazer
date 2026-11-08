import { useState } from 'react';
import { PlannedOutingRow, PlannedOutingStatus, PlannedOutingUpdate } from '@/shared/types';

export interface UsePlannedOutingEditFormOptions {
  onSubmit: (updates: PlannedOutingUpdate) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  /** Loading state driven by the parent (save or delete in progress). */
  isLoading: boolean;
  /** Delete in progress, driven by the parent. */
  isDeleting: boolean;
  /** Error coming from the parent, shown after the local validation error. */
  error: string | null;
}

/** Field values, validation, save and delete flow of `PlannedOutingEditForm`. */
export function usePlannedOutingEditForm(
  plannedOuting: PlannedOutingRow,
  { onSubmit, onDelete, isLoading, isDeleting, error }: UsePlannedOutingEditFormOptions,
) {
  const [title, setTitle] = useState(plannedOuting.title);
  const [description, setDescription] = useState(plannedOuting.description || '');
  const [notes, setNotes] = useState(plannedOuting.notes || '');
  const [scheduledFor, setScheduledFor] = useState(new Date(plannedOuting.scheduled_for));
  const [durationMin, setDurationMin] = useState<number | null>(plannedOuting.duration_min);
  const [status, setStatus] = useState<PlannedOutingStatus>(plannedOuting.status);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isDeletingInternal, setIsDeletingInternal] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError("Le nom de l'étape est obligatoire.");
      return;
    }
    setFormError(null);
    setIsSubmittingInternal(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        scheduled_for: scheduledFor.toISOString(),
        duration_min: durationMin,
        status,
      });
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeletingInternal(true);
    try {
      await onDelete(plannedOuting.id);
    } finally {
      setIsDeletingInternal(false);
      setIsConfirmingDelete(false);
    }
  };

  const isDeletingActive = isDeleting || isDeletingInternal;
  const isSavingActive = isSubmittingInternal || (isLoading && !isDeletingActive);

  return {
    title,
    setTitle,
    description,
    setDescription,
    notes,
    setNotes,
    scheduledFor,
    setScheduledFor,
    durationMin,
    setDurationMin,
    status,
    setStatus,
    isConfirmingDelete,
    setIsConfirmingDelete,
    handleSubmit,
    handleConfirmDelete,
    isDeletingActive,
    isSavingActive,
    isAnyLoading: isLoading || isSavingActive || isDeletingActive,
    displayError: formError || error,
  };
}
