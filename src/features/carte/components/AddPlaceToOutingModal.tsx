import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useOutingsStore } from '@/features/outings/store/useOutingsStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ThemedDateTimePicker } from '@/shared/components/ThemedDateTimePicker';
import { colors, spacing, typography } from '@/shared/constants/theme';
import {
  OUTING_STATUS_CONFIG,
  OutingRow,
  PlannedOutingInsert,
  PlannedOutingRow,
  PlannedOutingStatus,
  PLANNED_OUTING_STATUS_CONFIG,
} from '@/shared/types';
import { PlaceItem } from '../types/carte';
import { ensurePlaceExists } from '../services/placeService';
import { useMapStore } from '../store/useMapStore';

export interface AddPlaceToOutingModalProps {
  visible: boolean;
  place: PlaceItem | null;
  onClose: () => void;
  onSuccess?: (outing: OutingRow, plannedOuting: PlannedOutingRow) => void;
  initialOuting?: OutingRow | null;
  targetOutingId?: string | null;
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
];

const CATEGORY_LABELS: Record<string, { name: string; badgeColor: string }> = {
  resto: { name: 'Restaurant', badgeColor: colors.secondary },
  bar: { name: 'Bar & Lounge', badgeColor: colors.accent },
  activite: { name: 'Activité', badgeColor: colors.primary },
  nature: { name: 'Outdoor', badgeColor: colors.success },
  culture: { name: 'Culture', badgeColor: colors.warning },
  all: { name: 'Lieu', badgeColor: colors.primary },
};

export const AddPlaceToOutingModal: React.FC<AddPlaceToOutingModalProps> = ({
  visible,
  place,
  onClose,
  onSuccess,
  initialOuting,
  targetOutingId: propTargetOutingId,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 24);
  const bottomPadding = Math.max(insets.bottom, 16);

  const { user } = useAuth();
  const outings = useOutingsStore((state) => state.outings);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const addPlannedOuting = useOutingsStore((state) => state.addPlannedOuting);
  const storeTargetOutingId = useMapStore((state) => state.targetOutingId);

  const effectiveTargetId = propTargetOutingId ?? storeTargetOutingId;

  const [step, setStep] = useState<'select-outing' | 'edit-planned'>('select-outing');
  const [selectedOuting, setSelectedOuting] = useState<OutingRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingOuting, setIsCreatingOuting] = useState(false);

  // Planned outing form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [durationMin, setDurationMin] = useState<number | null>(60);
  const [status, setStatus] = useState<PlannedOutingStatus>('pending');
  const [validationError, setValidationError] = useState<string | null>(null);

  // DateTimePicker modal state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const prevVisibleRef = useRef(false);

  // Initialise les champs du formulaire avec les infos du lieu lors de la sélection d'une sortie
  const applyOutingAndPlace = React.useCallback((outing: OutingRow, targetPlace: PlaceItem) => {
    setSelectedOuting(outing);
    setTitle(targetPlace.title);
    setDescription(targetPlace.description || '');

    const practicalNotes: string[] = [];
    if (targetPlace.address) practicalNotes.push(`Adresse : ${targetPlace.address}`);
    if (targetPlace.phone) practicalNotes.push(`Tél : ${targetPlace.phone}`);
    if (targetPlace.website) practicalNotes.push(`Site : ${targetPlace.website}`);
    if (targetPlace.priceRange) practicalNotes.push(`Prix : ${targetPlace.priceRange}`);
    if (targetPlace.openingHours && targetPlace.openingHours.length > 0) {
      practicalNotes.push(`Horaires :\n${targetPlace.openingHours.join('\n')}`);
    }

    setNotes(practicalNotes.join('\n\n'));
    setScheduledDate(new Date(outing.start_date || Date.now()));
    setDurationMin(60);
    setStatus('pending');
    setValidationError(null);
    setStep('edit-planned');
  }, []);

  useEffect(() => {
    const wasJustOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (wasJustOpened && place) {
      fetchOutings();
      if (initialOuting) {
        applyOutingAndPlace(initialOuting, place);
      } else if (effectiveTargetId) {
        const targeted = useOutingsStore.getState().outings.find((o) => o.id === effectiveTargetId);
        if (targeted) {
          applyOutingAndPlace(targeted, place);
        } else {
          setStep('select-outing');
          setSelectedOuting(null);
        }
      } else {
        setStep('select-outing');
        setSelectedOuting(null);
      }
    }
  }, [visible, place, initialOuting, effectiveTargetId, fetchOutings, applyOutingAndPlace]);

  const handleSelectOuting = (outing: OutingRow) => {
    if (place) {
      applyOutingAndPlace(outing, place);
    }
  };

  const handleCreateNewOuting = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour créer une sortie.');
      return;
    }

    setIsCreatingOuting(true);
    try {
      const now = new Date();
      const defaultEndDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const newOuting = await createOuting({
        title: `Sortie avec ${place?.title || 'étape'}`,
        description: `Sortie incluant ${place?.title || 'un nouveau lieu'}`,
        start_date: now.toISOString(),
        end_date: defaultEndDate.toISOString(),
        status: 'planned',
        created_by: user.id,
      });

      if (newOuting) {
        handleSelectOuting(newOuting);
      }
    } catch {
      Alert.alert('Erreur', "Impossible de créer la sortie d'accueil.");
    } finally {
      setIsCreatingOuting(false);
    }
  };

  // Filtrer les sorties non terminées et non annulées
  const activeOutings = outings.filter(
    (o) => o.status !== 'done' && o.status !== 'cancelled'
  );

  const handleSavePlannedOuting = async () => {
    if (!selectedOuting || !place) return;

    if (!title.trim()) {
      setValidationError("Le nom de l'étape est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // 1. S'assurer que le lieu est créé ou existe dans Supabase
      const placeId = await ensurePlaceExists(place, user?.id);

      // 2. Créer le planned outing lié à la sortie et au lieu
      const payload: PlannedOutingInsert = {
        outing_id: selectedOuting.id,
        place_id: placeId,
        created_by: user?.id || selectedOuting.created_by,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        scheduled_for: scheduledDate.toISOString(),
        duration_min: durationMin && durationMin > 0 ? durationMin : null,
        status,
      };

      const newPlanned = await addPlannedOuting(payload);

      if (newPlanned) {
        Alert.alert(
          'Étape ajoutée !',
          `Le lieu "${place.title}" a bien été ajouté à la sortie "${selectedOuting.title}".`
        );
        if (onSuccess) {
          onSuccess(selectedOuting, newPlanned);
        }
        handleClose();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'étape";
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select-outing');
    setSelectedOuting(null);
    setValidationError(null);
    onClose();
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

  const catInfo = place ? CATEGORY_LABELS[place.category] || CATEGORY_LABELS.all : CATEGORY_LABELS.all;

  if (!place) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: topPadding + spacing.sm,
            paddingBottom: bottomPadding,
          },
        ]}
        testID="modal-add-poi-to-outing"
      >
        {/* Header commun */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            {step === 'edit-planned' && (
              <TouchableOpacity
                onPress={() => setStep('select-outing')}
                style={styles.headerBackBtn}
                accessibilityRole="button"
                accessibilityLabel="Changer de sortie"
                testID="btn-back-to-outings-list"
              >
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {step === 'select-outing' ? 'Ajouter à une sortie' : "Planifier l'étape"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
            testID="btn-close-add-modal"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Place Preview Banner */}
        <View style={styles.poiBanner} testID="poi-preview-banner">
          <View style={styles.poiBannerHeader}>
            <View style={[styles.badge, { backgroundColor: catInfo.badgeColor }]}>
              <Text style={styles.badgeText}>{catInfo.name}</Text>
            </View>
            {place.rating > 0 && (
              <Text style={styles.poiRating}>⭐ {place.rating.toFixed(1)}</Text>
            )}
          </View>
          <Text style={styles.poiTitle} numberOfLines={1}>
            {place.title}
          </Text>
          <Text style={styles.poiAddress} numberOfLines={1}>
            📍 {place.address}
          </Text>
        </View>

        {step === 'select-outing' ? (
          /* STEP 1 : Sélection d'une sortie */
          <View style={styles.stepContainer} testID="step-select-outing">
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Vos sorties actives</Text>
              <Text style={styles.sectionSubtitle}>
                {activeOutings.length} sortie{activeOutings.length > 1 ? 's' : ''} disponible{activeOutings.length > 1 ? 's' : ''}
              </Text>
            </View>

            {activeOutings.length === 0 ? (
              <View style={styles.emptyOutingsContainer} testID="empty-outings-state">
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>Aucune sortie active</Text>
                <Text style={styles.emptySubtitle}>
                  Vous n&apos;avez pas de sortie en cours ou planifiée. Créez-en une nouvelle pour y ajouter ce lieu !
                </Text>
                <Button
                  title="+ Créer une nouvelle sortie"
                  variant="primary"
                  onPress={handleCreateNewOuting}
                  loading={isCreatingOuting}
                  style={styles.createOutingBtn}
                  testID="btn-create-outing-empty"
                />
              </View>
            ) : (
              <FlatList
                data={activeOutings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.outingsList}
                testID="active-outings-list"
                renderItem={({ item }) => {
                  const statusInfo = OUTING_STATUS_CONFIG[item.status] || {
                    label: item.status,
                    emoji: '📌',
                  };
                  const startDateFormatted = new Date(item.start_date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectOuting(item)}
                      activeOpacity={0.7}
                      testID={`btn-select-outing-${item.id}`}
                    >
                      <Card style={styles.outingCard}>
                        <View style={styles.outingCardHeader}>
                          <Text style={styles.outingTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.outingStatusBadge}>
                            <Text style={styles.outingStatusText}>
                              {statusInfo.emoji} {statusInfo.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.outingDate}>📅 {startDateFormatted}</Text>
                        {item.description ? (
                          <Text style={styles.outingDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                      </Card>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <Button
                    title="+ Créer une nouvelle sortie"
                    variant="outline"
                    onPress={handleCreateNewOuting}
                    loading={isCreatingOuting}
                    style={styles.createOutingFooterBtn}
                    testID="btn-create-new-outing"
                  />
                }
              />
            )}
          </View>
        ) : (
          /* STEP 2 : Édition de l'étape planifiée */
          <ScrollView
            style={styles.stepContainer}
            contentContainerStyle={styles.scrollContent}
            testID="step-edit-planned"
          >
            <View style={styles.parentOutingHeader}>
              <Text style={styles.parentOutingLabel}>Pour la sortie :</Text>
              <Text style={styles.parentOutingTitle} numberOfLines={1}>
                {selectedOuting?.title}
              </Text>
            </View>

            <Card style={styles.formCard}>
              {/* Titre de l'étape */}
              <View style={styles.titleContainer}>
                <Text style={styles.inputGroupLabel}>Nom de l&apos;étape</Text>
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

              {validationError ? (
                <View style={styles.errorContainer} testID="error-container">
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              ) : null}

              {/* Statut de l'étape */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputGroupLabel}>Statut</Text>
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

              {/* Date & Heure */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputGroupLabel}>Date et heure planifiée</Text>
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

              {/* Date Picker Modal */}
              <ThemedDateTimePicker
                visible={showPicker}
                value={scheduledDate}
                mode={pickerMode}
                onConfirm={handleDateConfirm}
                onCancel={() => setShowPicker(false)}
              />

              {/* Durée estimée */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputGroupLabel}>Durée estimée</Text>
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
                <View style={styles.customDurationContainer}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="Personnalisé (min)"
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

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputGroupLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Détails de l'étape ou activités prévues..."
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

              {/* Notes & infos pratiques */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputGroupLabel}>Notes & infos pratiques</Text>
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

              {/* Actions */}
              <View style={styles.actionButtons}>
                <Button
                  title="Annuler"
                  variant="outline"
                  size="sm"
                  onPress={() => setStep('select-outing')}
                  style={styles.actionButton}
                  testID="btn-cancel-planned-step"
                />
                <Button
                  title="Ajouter à la sortie"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                  onPress={handleSavePlannedOuting}
                  style={styles.actionButton}
                  testID="btn-submit-planned-step"
                />
              </View>
            </Card>
          </ScrollView>
        )}
      </View>
    </Modal>
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
    marginTop: spacing.md,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  createOutingBtn: {
    marginTop: spacing.md,
  },
  createOutingFooterBtn: {
    marginTop: spacing.sm,
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
    width: 140,
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
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  emptyOutingsContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: spacing.lg,
    padding: spacing.xl,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
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
  formCard: {
    padding: spacing.md,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerBackBtn: {
    marginRight: spacing.xs,
    padding: spacing.xs / 2,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
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
  inputGroupLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  outingCard: {
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  outingCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs / 2,
  },
  outingDate: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.xs / 2,
  },
  outingDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  outingsList: {
    paddingBottom: spacing.xxl,
  },
  outingStatusBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  outingStatusText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
  },
  outingTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.xs,
  },
  parentOutingHeader: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  parentOutingLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  parentOutingTitle: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  poiAddress: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  poiBanner: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  poiBannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs / 2,
  },
  poiRating: {
    color: colors.warning,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  poiTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
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
  stepContainer: {
    flex: 1,
  },
  textArea: {
    minHeight: 70,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  titleContainer: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
  },
  titleInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
