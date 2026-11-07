import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  ChipGroup,
  ChipOption,
  DateTimeField,
  InlineAlert,
  TextField,
} from '@/shared/components';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { colors, spacing } from '@/shared/constants/theme';
import {
  Constants,
  OUTING_STATUS_CONFIG,
  OutingRow,
  OutingStatus,
  OutingUpdate,
  PlannedOutingRow,
} from '@/shared/types';
import { useOutingsStore } from '../store/useOutingsStore';
import { PlannedOutingsTimeline } from './PlannedOutingsTimeline';

export interface OutingEditFormProps {
  outing: OutingRow;
  onSubmit: (updates: OutingUpdate) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  onCancel?: () => void;
  plannedOutings?: PlannedOutingRow[];
  onAddPlannedOuting?: () => Promise<void> | void;
  onAddFromMap?: () => void;
  isAddingPlannedOuting?: boolean;
  onSelectPlannedOuting?: (plannedOuting: PlannedOutingRow) => void;
}

const STATUS_OPTIONS: ChipOption<OutingStatus>[] = Constants.public.Enums.outing_status.map(
  (status: OutingStatus) => ({
    value: status,
    label: OUTING_STATUS_CONFIG[status].label,
    emoji: OUTING_STATUS_CONFIG[status].emoji,
  }),
);

export const OutingEditForm: React.FC<OutingEditFormProps> = ({
  outing,
  onSubmit,
  isLoading = false,
  error = null,
  onCancel,
  plannedOutings: propPlannedOutings,
  onAddPlannedOuting: propOnAddPlannedOuting,
  onAddFromMap: propOnAddFromMap,
  isAddingPlannedOuting = false,
  onSelectPlannedOuting: propOnSelectPlannedOuting,
}) => {
  const router = useRouter();
  const storePlannedOutings = useOutingsStore((state) => state.plannedOutings);
  const fetchPlannedOutings = useOutingsStore((state) => state.fetchPlannedOutings);
  const createPlannedOuting = useOutingsStore((state) => state.createPlannedOuting);
  const setSelectedPlannedOutingId = useOutingsStore((state) => state.setSelectedPlannedOutingId);
  const isLoadingPlannedOutings = useOutingsStore((state) => state.isLoadingPlannedOutings);

  const [title, setTitle] = useState(outing.title || '');
  const [description, setDescription] = useState(outing.description || '');
  const [startDate, setStartDate] = useState<Date>(() => {
    if (outing.start_date) {
      const parsed = new Date(outing.start_date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [status, setStatus] = useState<OutingStatus>(outing.status || 'draft');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!propPlannedOutings && outing?.id) {
      fetchPlannedOutings(outing.id);
    }
  }, [outing?.id, propPlannedOutings, fetchPlannedOutings]);

  const activePlannedOutings =
    propPlannedOutings ?? storePlannedOutings.filter((p) => p.outing_id === outing.id);

  const handleAddPlannedOuting = async () => {
    if (propOnAddPlannedOuting) {
      await propOnAddPlannedOuting();
    } else {
      const newPlanned = await createPlannedOuting(outing.id, {
        title: `Étape ${activePlannedOutings.length + 1}`,
      });
      if (propOnSelectPlannedOuting && newPlanned) {
        propOnSelectPlannedOuting(newPlanned);
      }
    }
  };

  const handleAddFromMap = () => {
    if (propOnAddFromMap) {
      propOnAddFromMap();
    } else {
      useMapStore.getState().setTargetOutingId(outing.id);
      router.push('/(tabs)/carte');
    }
  };

  const handleSelectPlannedOuting = (plannedOuting: PlannedOutingRow) => {
    if (propOnSelectPlannedOuting) {
      propOnSelectPlannedOuting(plannedOuting);
    } else {
      setSelectedPlannedOutingId(plannedOuting.id);
    }
  };

  const handleSubmit = async () => {
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Le titre de la sortie est obligatoire.');
      return;
    }

    const updates: OutingUpdate = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      start_date: startDate.toISOString(),
      status,
    };

    await onSubmit(updates);
  };

  const displayError = validationError || error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.card}>
        <TextField
          variant="title"
          placeholder="Titre de la sortie..."
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (validationError) setValidationError(null);
          }}
          containerStyle={styles.titleField}
          accessibilityLabel="Titre de la sortie"
          testID="input-title"
        />

        {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

        <TextField
          label="Description"
          placeholder="Détails du programme, lieu de rendez-vous..."
          value={description}
          onChangeText={setDescription}
          multiline
          minHeight={90}
          numberOfLines={4}
          accessibilityLabel="Description"
          testID="input-description"
        />

        <DateTimeField label="Date et heure de début" value={startDate} onChange={setStartDate} />

        <ChipGroup
          label="Statut de la sortie"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          testID="btn-status"
        />

        <View style={styles.actionButtons}>
          {onCancel ? (
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.actionButton}
              testID="btn-cancel-outing-edit"
            />
          ) : null}

          <Button
            title="Enregistrer"
            size="sm"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.actionButton}
            testID="btn-submit-outing-edit"
          />
        </View>
      </Card>

      {/* Planned Outings timeline section */}
      <PlannedOutingsTimeline
        plannedOutings={activePlannedOutings}
        onAddPlannedOuting={handleAddPlannedOuting}
        onAddFromMap={handleAddFromMap}
        onSelectPlannedOuting={handleSelectPlannedOuting}
        isLoading={!propPlannedOutings && isLoadingPlannedOutings}
        isAdding={isAddingPlannedOuting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.lg,
    width: '100%',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  titleField: {
    marginBottom: spacing.lg,
  },
});
