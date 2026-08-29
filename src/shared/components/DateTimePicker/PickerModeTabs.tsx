import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';

export interface PickerModeTabsProps {
  currentMode: 'date' | 'time';
  onModeChange: (mode: 'date' | 'time') => void;
}

export const PickerModeTabs: React.FC<PickerModeTabsProps> = ({
  currentMode,
  onModeChange,
}) => {
  return (
    <View style={styles.modeTabs}>
      <TouchableOpacity
        style={[styles.modeTab, currentMode === 'date' && styles.modeTabActive]}
        onPress={() => onModeChange('date')}
        testID="tab-picker-date"
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar"
          size={16}
          color={currentMode === 'date' ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.modeTabText,
            currentMode === 'date' && styles.modeTabTextActive,
          ]}
        >
          Date
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeTab, currentMode === 'time' && styles.modeTabActive]}
        onPress={() => onModeChange('time')}
        testID="tab-picker-time"
        activeOpacity={0.7}
      >
        <Ionicons
          name="time"
          size={16}
          color={currentMode === 'time' ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.modeTabText,
            currentMode === 'time' && styles.modeTabTextActive,
          ]}
        >
          Heure
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modeTab: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeTabText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
