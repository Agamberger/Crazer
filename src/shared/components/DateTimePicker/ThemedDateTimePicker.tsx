import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button } from '../Button';
import { colors, spacing } from '../../constants/theme';
import { CalendarPickerView } from './CalendarPickerView';
import { PickerModeTabs } from './PickerModeTabs';
import { TimePickerView } from './TimePickerView';

export interface ThemedDateTimePickerProps {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time';
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const ThemedDateTimePicker: React.FC<ThemedDateTimePickerProps> = ({
  visible,
  value,
  mode = 'date',
  onConfirm,
  onCancel,
}) => {
  const [currentMode, setCurrentMode] = useState<'date' | 'time'>(mode);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(value));
  const [viewYear, setViewYear] = useState<number>(() => value.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => value.getMonth());

  // Synchronisation lorsque la modal s'ouvre
  React.useEffect(() => {
    if (visible) {
      const validDate = isNaN(value.getTime()) ? new Date() : new Date(value);
      setSelectedDate(validDate);
      setViewYear(validDate.getFullYear());
      setViewMonth(validDate.getMonth());
      setCurrentMode(mode);
    }
  }, [visible, value, mode]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setFullYear(viewYear);
    nextDate.setMonth(viewMonth);
    nextDate.setDate(day);
    setSelectedDate(nextDate);
  };

  const handleSelectHour = (hour: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setHours(hour);
    setSelectedDate(nextDate);
  };

  const handleSelectMinute = (minute: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setMinutes(minute);
    setSelectedDate(nextDate);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="themed-datetimepicker-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Onglets de sélection du mode */}
          <PickerModeTabs
            currentMode={currentMode}
            onModeChange={setCurrentMode}
          />

          {/* Vue Calendrier ou Vue Heure */}
          {currentMode === 'date' ? (
            <CalendarPickerView
              selectedDate={selectedDate}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onSelectDay={handleSelectDay}
            />
          ) : (
            <TimePickerView
              selectedDate={selectedDate}
              onSelectHour={handleSelectHour}
              onSelectMinute={handleSelectMinute}
            />
          )}

          {/* Boutons d'action */}
          <View style={styles.footer}>
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.actionBtn}
              testID="btn-picker-cancel"
            />
            <Button
              title="Valider"
              variant="primary"
              size="sm"
              onPress={handleConfirm}
              style={styles.actionBtn}
              testID="btn-picker-confirm"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionBtn: {
    flex: 1,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
  },
});
