import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { SplitType } from '../types';
import { formatCentsToEuros } from '../utils/formatters';

export interface ParticipantSplitRowProps {
  userId: string;
  userName: string;
  splitMode: SplitType;
  isSelected: boolean;
  onToggleSelect: (selected: boolean) => void;
  customValue: number;
  onChangeValue: (value: number) => void;
  computedAmountCents: number;
  isCurrentUser?: boolean;
  testID?: string;
}

export const ParticipantSplitRow: React.FC<ParticipantSplitRowProps> = ({
  userId,
  userName,
  splitMode,
  isSelected,
  onToggleSelect,
  customValue,
  onChangeValue,
  computedAmountCents,
  isCurrentUser = false,
  testID,
}) => {
  const initials = (userName || 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || parsed < 0) {
      onChangeValue(0);
    } else {
      onChangeValue(parsed);
    }
  };

  const incrementShares = () => {
    onChangeValue(Math.max(1, (customValue || 1) + 1));
  };

  const decrementShares = () => {
    onChangeValue(Math.max(1, (customValue || 1) - 1));
  };

  return (
    <View
      style={[styles.container, !isSelected && styles.containerDisabled]}
      testID={testID || `participant-split-row-${userId}`}
    >
      {/* Checkbox / Toggle */}
      <TouchableOpacity
        style={styles.checkboxTouch}
        onPress={() => onToggleSelect(!isSelected)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        testID={`toggle-participant-${userId}`}
      >
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>

      {/* Avatar & Nom */}
      <View style={styles.userInfo}>
        <View style={[styles.avatar, isCurrentUser && styles.avatarUser]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName} {isCurrentUser ? '(Toi)' : ''}
          </Text>
          {isSelected && splitMode !== 'exact' ? (
            <Text style={styles.computedText} testID={`computed-amount-${userId}`}>
              Part : {formatCentsToEuros(computedAmountCents)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Champ d'ajustement selon mode */}
      {isSelected ? (
        <View style={styles.inputArea}>
          {splitMode === 'equal' && (
            <Text style={styles.equalAmountText} testID={`equal-amount-${userId}`}>
              {formatCentsToEuros(computedAmountCents)}
            </Text>
          )}

          {splitMode === 'exact' && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={customValue > 0 ? (customValue / 100).toString() : ''}
                onChangeText={(text) => {
                  const cleaned = text.replace(',', '.');
                  const parsed = parseFloat(cleaned);
                  const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
                  onChangeValue(cents);
                }}
                testID={`input-split-exact-${userId}`}
              />
              <Text style={styles.unitText}>€</Text>
            </View>
          )}

          {splitMode === 'percentage' && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={customValue > 0 ? customValue.toString() : ''}
                onChangeText={handleTextChange}
                testID={`input-split-percentage-${userId}`}
              />
              <Text style={styles.unitText}>%</Text>
            </View>
          )}

          {splitMode === 'shares' && (
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={decrementShares}
                disabled={customValue <= 1}
                testID={`btn-dec-shares-${userId}`}
              >
                <Ionicons name="remove" size={16} color={customValue <= 1 ? colors.textMuted : colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sharesValueText} testID={`shares-value-${userId}`}>
                {customValue || 1}
              </Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={incrementShares}
                testID={`btn-inc-shares-${userId}`}
              >
                <Ionicons name="add" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.excludedText}>Exclu</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
    width: 32,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  avatarUser: {
    borderColor: colors.primary,
  },
  checkboxTouch: {
    marginRight: spacing.xs,
    padding: spacing.xs,
  },
  computedText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  equalAmountText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  excludedText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  inputArea: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
  },
  nameContainer: {
    flex: 1,
  },
  numericInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    minWidth: 50,
    padding: 4,
    textAlign: 'right',
  },
  sharesValueText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginHorizontal: spacing.xs,
    minWidth: 20,
    textAlign: 'center',
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepperContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  unitText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginLeft: 2,
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});
