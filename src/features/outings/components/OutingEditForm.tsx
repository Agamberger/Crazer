import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ThemedDateTimePicker } from '@/shared/components/DateTimePicker';
import { colors, spacing, typography } from '@/shared/constants/theme';
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

const STATUS_OPTIONS: { value: OutingStatus; label: string; emoji: string }[] =
  Constants.public.Enums.outing_status.map((status: OutingStatus) => ({
    value: status,
    label: OUTING_STATUS_CONFIG[status].label,
    emoji: OUTING_STATUS_CONFIG[status].emoji,
  }));

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
  const setSelectedPlannedOutingId = useOutingsStore(
    (state) => state.setSelectedPlannedOutingId
  );
  const isLoadingPlannedOutings = useOutingsStore(
    (state) => state.isLoadingPlannedOutings
  );

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
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const [status, setStatus] = useState<OutingStatus>(outing.status || 'draft');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!propPlannedOutings && outing?.id) {
      fetchPlannedOutings(outing.id);
    }
  }, [outing?.id, propPlannedOutings, fetchPlannedOutings]);

  const activePlannedOutings =
    propPlannedOutings ??
    storePlannedOutings.filter((p) => p.outing_id === outing.id);

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

  const handleOpenPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleDateConfirm = (newDate: Date) => {
    setStartDate(newDate);
    setShowPicker(false);
  };

  const formattedDate = startDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayError = validationError || error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.card}>
        {/* Outing title editable directly at the top */}
        <View style={styles.titleContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Titre de la sortie..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (validationError) setValidationError(null);
            }}
            accessibilityLabel="Titre de la sortie"
            testID="input-title"
          />
        </View>

        {displayError ? (
          <View style={styles.errorContainer} testID="error-container">
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        {/* Outing description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Détails du programme, lieu de rendez-vous..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Description"
            testID="input-description"
          />
        </View>

        {/* Start date & time with picker triggers */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date et heure de début</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                showPicker && pickerMode === 'date' && styles.dateTimeButtonActive,
              ]}
              onPress={() => handleOpenPicker('date')}
              testID="btn-select-date"
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeButtonHeader}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={showPicker && pickerMode === 'date' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dateTimeButtonLabel,
                    showPicker && pickerMode === 'date' && styles.dateTimeButtonLabelActive,
                  ]}
                >
                  Date
                </Text>
              </View>
              <Text style={styles.dateTimeButtonValue} testID="formatted-date-text">
                {formattedDate}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                showPicker && pickerMode === 'time' && styles.dateTimeButtonActive,
              ]}
              onPress={() => handleOpenPicker('time')}
              testID="btn-select-time"
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeButtonHeader}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={showPicker && pickerMode === 'time' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dateTimeButtonLabel,
                    showPicker && pickerMode === 'time' && styles.dateTimeButtonLabelActive,
                  ]}
                >
                  Heure
                </Text>
              </View>
              <Text style={styles.dateTimeButtonValue} testID="formatted-time-text">
                {formattedTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Crazer themed date & time picker modal */}
        <ThemedDateTimePicker
          visible={showPicker}
          value={startDate}
          mode={pickerMode}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowPicker(false)}
        />

        {/* Outing status derived from Supabase enum */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Statut de la sortie</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((item) => {
              const isSelected = status === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.statusBadge, isSelected && styles.statusBadgeActive]}
                  onPress={() => setStatus(item.value)}
                  testID={`btn-status-${item.value}`}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isSelected && styles.statusBadgeTextActive,
                    ]}
                  >
                    {item.emoji} {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {onCancel ? (
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.cancelButton}
              testID="btn-cancel-outing-edit"
            />
          ) : null}

          <Button
            title="Enregistrer"
            variant="primary"
            size="sm"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.submitButton}
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
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
  dateTimeButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateTimeButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  dateTimeButtonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  dateTimeButtonLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  dateTimeButtonLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  dateTimeButtonValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  statusBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  statusBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  statusBadgeTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  submitButton: {
    flex: 1,
  },
  textArea: {
    minHeight: 90,
  },
  titleContainer: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
    paddingBottom: spacing.xs,
  },
  titleInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
