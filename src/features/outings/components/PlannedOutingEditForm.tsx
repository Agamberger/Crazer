import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ThemedDateTimePicker } from '@/shared/components/ThemedDateTimePicker';
import { colors, spacing, typography } from '@/shared/constants/theme';
import {
  Constants,
  PLANNED_OUTING_STATUS_CONFIG,
  PlannedOutingRow,
  PlannedOutingStatus,
  PlannedOutingUpdate,
} from '@/shared/types';

export interface PlannedOutingEditFormProps {
  plannedOuting: PlannedOutingRow;
  parentOutingTitle?: string;
  onSubmit: (updates: PlannedOutingUpdate) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  error?: string | null;
}

const DURATION_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

const STATUS_OPTIONS: { value: PlannedOutingStatus; label: string; emoji: string }[] =
  Constants.public.Enums.planned_outing_status.map((status: PlannedOutingStatus) => ({
    value: status,
    label: PLANNED_OUTING_STATUS_CONFIG[status]?.label || status,
    emoji: PLANNED_OUTING_STATUS_CONFIG[status]?.emoji || '📌',
  }));

export const PlannedOutingEditForm: React.FC<PlannedOutingEditFormProps> = ({
  plannedOuting,
  parentOutingTitle,
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
  isDeleting = false,
  error = null,
}) => {
  const [title, setTitle] = useState(plannedOuting.title || '');
  const [description, setDescription] = useState(plannedOuting.description || '');
  const [notes, setNotes] = useState(plannedOuting.notes || '');
  const [durationMin, setDurationMin] = useState<number | null>(plannedOuting.duration_min ?? 60);
  const [status, setStatus] = useState<PlannedOutingStatus>(plannedOuting.status || 'pending');

  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    if (plannedOuting.scheduled_for) {
      const parsed = new Date(plannedOuting.scheduled_for);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });

  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("Le nom de l'étape est obligatoire.");
      return;
    }

    const updates: PlannedOutingUpdate = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      scheduled_for: scheduledDate.toISOString(),
      duration_min: durationMin && durationMin > 0 ? durationMin : null,
      status,
    };

    await onSubmit(updates);
  };

  const handleConfirmDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      "Supprimer l'étape",
      'Êtes-vous sûr de vouloir supprimer cette étape ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete();
          },
        },
      ]
    );
  };

  const handleOpenPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleDateConfirm = (newDate: Date) => {
    setScheduledDate(newDate);
    setShowPicker(false);
  };

  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayError = validationError || error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top back button and parent outing context */}
      <View style={styles.topBar}>
        {onCancel && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Retour à la sortie"
            testID="btn-back-to-outing"
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        {parentOutingTitle && (
          <Text style={styles.parentContext} numberOfLines={1}>
            Sortie : {parentOutingTitle}
          </Text>
        )}
      </View>

      <Card style={styles.card}>
        {/* Planned outing title */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionHeaderLabel}>Étape du programme</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Nom de l'étape..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (validationError) setValidationError(null);
            }}
            accessibilityLabel="Nom de l'étape"
            testID="input-planned-title"
          />
        </View>

        {displayError ? (
          <View style={styles.errorContainer} testID="error-container">
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        {/* Planned outing status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Statut de l'étape</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((item) => {
              const isSelected = status === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.statusBadge, isSelected && styles.statusBadgeActive]}
                  onPress={() => setStatus(item.value)}
                  testID={`btn-planned-status-${item.value}`}
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

        {/* Scheduled Date and Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date et heure planifiée</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                showPicker && pickerMode === 'date' && styles.dateTimeButtonActive,
              ]}
              onPress={() => handleOpenPicker('date')}
              testID="btn-select-planned-date"
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
              <Text style={styles.dateTimeButtonValue} testID="formatted-planned-date-text">
                {formattedDate}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                showPicker && pickerMode === 'time' && styles.dateTimeButtonActive,
              ]}
              onPress={() => handleOpenPicker('time')}
              testID="btn-select-planned-time"
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
              <Text style={styles.dateTimeButtonValue} testID="formatted-planned-time-text">
                {formattedTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Crazer themed date & time picker modal */}
        <ThemedDateTimePicker
          visible={showPicker}
          value={scheduledDate}
          mode={pickerMode}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowPicker(false)}
        />

        {/* Estimated duration */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Durée estimée</Text>
          <View style={styles.durationPresetsRow}>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = durationMin === preset.value;
              return (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.durationChip,
                    isSelected && styles.durationChipActive,
                  ]}
                  onPress={() => setDurationMin(preset.value)}
                  testID={`chip-duration-${preset.value}`}\n                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      isSelected && styles.durationChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.customDurationContainer}>
            <TextInput
              style={styles.durationInput}
              placeholder="Personnalisé (ex: 75)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={durationMin !== null ? durationMin.toString() : ''}
              onChangeText={(text) => {
                const numeric = parseInt(text.replace(/[^0-9]/g, ''), 10);
                setDurationMin(isNaN(numeric) ? null : numeric);
              }}
              accessibilityLabel="Durée en minutes"
              testID="input-planned-duration"
            />
            <Text style={styles.durationSuffix}>minutes</Text>
          </View>
        </View>

        {/* Description & planned activities */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Détails de l'étape, adresse ou activités prévues..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Description de l'étape"
            testID="input-planned-description"
          />
        </View>

        {/* Private notes & practical details */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes & infos pratiques</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Code de porte, numéro de réservation, consigne particulière..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Notes et informations pratiques"
            testID="input-planned-notes"
          />
        </View>

        {/* Save and cancel actions */}
        <View style={styles.actionButtons}>
          {onCancel && (
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.actionButton}
              testID="btn-cancel-planned-edit"
            />
          )}

          <Button
            title="Enregistrer"
            variant="primary"
            size="sm"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.actionButton}
            testID="btn-submit-planned-edit"
          />
        </View>

        {/* Destructive delete button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleConfirmDelete}
            disabled={isDeleting}
            testID="btn-delete-planned-edit"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Suppression en cours...' : 'Supprimer cette étape'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
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
    marginTop: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
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
  customDurationContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.error,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  durationChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  durationChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  durationChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  durationChipTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  durationInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    width: 160,
  },
  durationPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  durationSuffix: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
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
  parentContext: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  sectionHeaderLabel: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
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
  textArea: {
    minHeight: 80,
  },
  titleContainer: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
    paddingBottom: spacing.xs,
  },
  titleInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
