import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface SortieOption {
  id: string;
  title: string;
}

export interface SortieSelectorHeaderProps {
  sorties: SortieOption[];
  selectedSortieId: string | null;
  onSelectSortie: (id: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export const SortieSelectorHeader: React.FC<SortieSelectorHeaderProps> = ({
  sorties,
  selectedSortieId,
  onSelectSortie,
  style,
  testID = 'sortie-selector-header',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedSortie = sorties.find((s) => s.id === selectedSortieId) || sorties[0];
  const title = selectedSortie ? selectedSortie.title : 'Sélectionner une sortie';

  const handleSelect = (id: string) => {
    onSelectSortie(id);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => sorties.length > 1 && setModalVisible(true)}
        disabled={sorties.length <= 1}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Sortie sélectionnée : ${title}`}
        testID="sortie-selector-dropdown"
      >
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
        </View>
        <View style={styles.titleArea}>
          <Text style={styles.caption}>Sortie active</Text>
          <Text style={styles.title} numberOfLines={1} testID="active-sortie-title">
            {title}
          </Text>
        </View>
        {sorties.length > 1 ? (
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        ) : null}
      </TouchableOpacity>

      {/* Modal de sélection de sortie */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          testID="modal-backdrop-sorties"
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer de sortie</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="btn-close-sortie-selector"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sortieList}>
              {sorties.map((sortie) => {
                const isCurrent = sortie.id === selectedSortieId;
                return (
                  <TouchableOpacity
                    key={sortie.id}
                    style={[styles.sortieOption, isCurrent && styles.sortieOptionSelected]}
                    onPress={() => handleSelect(sortie.id)}
                    testID={`sortie-option-${sortie.id}`}
                  >
                    <Text
                      style={[styles.sortieOptionText, isCurrent && styles.sortieOptionTextSelected]}
                    >
                      {sortie.title}
                    </Text>
                    {isCurrent ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  caption: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 32,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '60%',
    padding: spacing.md,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortieList: {
    marginTop: spacing.xs,
  },
  sortieOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  sortieOptionSelected: {
    backgroundColor: colors.surfaceLight,
  },
  sortieOptionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  sortieOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  titleArea: {
    flex: 1,
  },
});
