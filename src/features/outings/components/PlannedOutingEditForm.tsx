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
  PLANNED_OUTING_STATUS_CONFIG,
  PlannedOutingRow,
  PlannedOutingStatus,
  PlannedOutingUpdate,
} from '@/shared/types';

export interface PlannedOutingEditFormProps {
  plannedOuting: PlannedOutingRow;
  parentOutingTitle?: string;
  onSubmit: (updates: PlannedOutingUpdate) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  error?: string | null;
  submitTestID?: string;
  cancelTestID?: string;
  deleteTestID?: string;
}

const STATUS_OPTIONS: { value: PlannedOutingStatus; label: string; emoji: string }[] = [
  {
    value: 'pending',
    label: PLANNED_OUTING_STATUS_CONFIG.pending?.label || 'En attente',
    emoji: PLANNED_OUTING_STATUS_CONFIG.pending?.emoji || '⏳',
  },
  {
    value: 'confirmed',
    label: PLANNED_OUTING_STATUS_CONFIG.confirmed?.label || 'Confirmée',
    emoji: PLANNED_OUTING_STATUS_CONFIG.confirmed?.emoji || '✅',
  },
  {
    value: 'skipped',
    label: PLANNED_OUTING_STATUS_CONFIG.skipped?.label || 'Ignorée',
    emoji: PLANNED_OUTING_STATUS_CONFIG.skipped?.emoji || '⏭️',
  },
  {
    value: 'cancelled',
    label: PLANNED_OUTING_STATUS_CONFIG.cancelled?.label || 'Annulée',
    emoji: PLANNED_OUTING_STATUS_CONFIG.cancelled?.emoji || '❌',
  },
];

const DURATION_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

export const PlannedOutingEditForm: React.FC<PlannedOutingEditFormProps> = ({
  plannedOuting,
  parentOutingTitle,
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
  isDeleting: propIsDeleting = false,
  error = null,
  submitTestID,
  cancelTestID,
  deleteTestID,
}) => {
  const [title, setTitle] = useState(plannedOuting.title);
  const [description, setDescription] = useState(plannedOuting.description || '');
  const [notes, setNotes] = useState(plannedOuting.notes || '');
  const [scheduledFor, setScheduledFor] = useState(new Date(plannedOuting.scheduled_for));
  const [durationMin, setDurationMin] = useState<number | null>(plannedOuting.duration_min);
  const [status, setStatus] = useState<PlannedOutingStatus>(plannedOuting.status);

  const [formError, setFormError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isDeletingInternal, setIsDeletingInternal] = useState(false);

  const handleOpenPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleDateTimeConfirm = (date: Date) => {
    setScheduledFor(date);
    setShowPicker(false);
  };

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

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      "Supprimer l'étape",
      `Êtes-vous sûr de vouloir supprimer "${plannedOuting.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingInternal(true);
            try {
              await onDelete(plannedOuting.id);
            } finally {
              setIsDeletingInternal(false);
            }
          },
        },
      ]
    );
  };

  const formattedDate = scheduledFor.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = scheduledFor.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isDeletingActive = propIsDeleting || isDeletingInternal;
  const isSavingActive = isSubmittingInternal || (isLoading && !isDeletingActive);
  const isAnyLoading = isLoading || isSavingActive || isDeletingActive;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      testID="planned-outing-edit-form"
    >
      {/* Back button and parent info header */}
      <View style={styles.headerNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel}
          accessibilityLabel="Retour à la sortie"
          accessibilityRole="button"
          testID="btn-back-to-outing"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        {parentOutingTitle ? (
          <Text style={styles.parentOutingSubtitle} numberOfLines={1}>
            Sortie : {parentOutingTitle}
          </Text>
        ) : null}
      </View>

      <Card style={styles.formCard}>
        {/* Form header */}
        <View style={styles.cardHeader}>
          <Text style={styles.formTitle}>Modifier l&apos;étape</Text>
        </View>

        {/* Global error banner */}
        {(formError || error) && (
          <View style={styles.errorBanner} testID="error-container">
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{formError || error}</Text>
          </View>
        )}

        {/* Title input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Nom de l&apos;étape <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bar Le Centenaire, Escape Game..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Nom de l'étape"
            testID="input-planned-title"
          />
        </View>

        {/* Status selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Statut de l&apos;étape</Text>
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
                    <Text>{item.emoji} </Text>
                    <Text>{item.label}</Text>
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

          <ThemedDateTimePicker
            visible={showPicker}
            mode={pickerMode}
            value={scheduledFor}
            onConfirm={handleDateTimeConfirm}
            onCancel={() => setShowPicker(false)}
          />
        </View>

        {/* Duration selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Durée estimée</Text>
          <View style={styles.durationPresetsGrid}>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = durationMin === preset.value;
              return (
                <TouchableOpacity
                  key={preset.value}
                  style={[styles.durationChip, isSelected && styles.durationChipActive]}
                  onPress={() => setDurationMin(preset.value)}
                  testID={`chip-duration-${preset.value}`}
                  activeOpacity={0.7}
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

          {/* Custom duration input */}
          <View style={styles.customDurationContainer}>
            <TextInput
              style={styles.customDurationInput}
              placeholder="Personnalisé (min)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={durationMin !== null ? durationMin.toString() : ''}
              onChangeText={(text) => {
                const numeric = parseInt(text.replace(/[^0-9]/g, ''), 10);
                setDurationMin(isNaN(numeric) ? null : numeric);
              }}
              accessibilityLabel="Durée personnalisée en minutes"
              testID="input-planned-duration"
            />
            <Text style={styles.customDurationSuffix}>minutes</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Détails du programme, consignes, réservations..."
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

        {/* Notes et infos pratiques */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes & infos pratiques</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Code porte, contact, numéro de table, itinéraire..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel="Notes et informations pratiques"
            testID="input-planned-notes"
          />
        </View>

        {/* Form Action Buttons */}
        <View style={styles.formActions}>
          <View style={styles.primaryActionsRow}>
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              disabled={isAnyLoading}
              style={styles.actionButton}
              testID={cancelTestID || 'btn-cancel-planned'}
            />
            <Button
              title="Enregistrer"
              variant="primary"
              size="sm"
              loading={isSavingActive}
              disabled={isAnyLoading}
              onPress={handleSubmit}
              style={styles.actionButton}
              testID={submitTestID || 'btn-submit-planned'}
            />
          </View>

          {onDelete && (
            <Button
              title="Supprimer"
              variant="outline"
              size="sm"
              loading={isDeletingActive}
              disabled={isAnyLoading}
              onPress={handleDelete}
              style={styles.deleteButton}
              textStyle={styles.deleteButtonText}
              testID={deleteTestID || 'btn-delete-planned'}
            />
          )}
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  cardHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  customDurationContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customDurationInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    width: 140,
  },
  customDurationSuffix: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
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
    marginBottom: spacing.xs,
  },
  deleteButton: {
    borderColor: colors.error,
    marginTop: spacing.sm,
    width: '100%',
  },
  deleteButtonText: {
    color: colors.error,
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
  durationPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorBannerText: {
    color: colors.error,
    flex: 1,
    fontSize: typography.fontSizes.xs,
  },
  formActions: {
    marginTop: spacing.md,
  },
  formCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  formTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  headerNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
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
  parentOutingSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
    maxWidth: 200,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  requiredAsterisk: {
    color: colors.error,
  },
  scrollContainer: {
    backgroundColor: colors.background,
    flex: 1,
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
    minHeight: 60,
  },
});
