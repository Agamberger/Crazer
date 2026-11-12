import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, BadgeTone } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { AttendanceKind, StepAttendance } from '../../types/planning';

export interface StepAttendanceListProps {
  attendance: StepAttendance[];
  testID?: string;
}

const TONES: Record<AttendanceKind, BadgeTone> = {
  present: 'success',
  arrivesLate: 'warning',
  leavesEarly: 'warning',
  partial: 'warning',
  absent: 'error',
};

const EMOJIS: Record<AttendanceKind, string> = {
  present: '✅',
  arrivesLate: '⏰',
  leavesEarly: '🚪',
  partial: '⏰',
  absent: '❌',
};

/** Short French description of one member's attendance (« Charlie · arrive à 20:00 »). */
export const describeAttendanceDetail = (entry: StepAttendance): string => {
  const name = entry.member.displayName;
  switch (entry.kind) {
    case 'present':
      return name;
    case 'arrivesLate':
      return `${name} · arrive à ${entry.arrival}`;
    case 'leavesEarly':
      return `${name} · part à ${entry.departure}`;
    case 'partial':
      return `${name} · ${entry.arrival}–${entry.departure}`;
    case 'absent':
      return `${name} · pas dispo`;
  }
};

/** Description with its status emoji (« ⏰ Charlie · arrive à 20:00 »). */
export const describeAttendance = (entry: StepAttendance): string =>
  `${EMOJIS[entry.kind]} ${describeAttendanceDetail(entry)}`;

/** Who takes part in a step, with late arrivals, early departures and absences. */
export const StepAttendanceList: React.FC<StepAttendanceListProps> = ({ attendance, testID }) => (
  <View style={styles.list} testID={testID}>
    {attendance.map((entry) => (
      <Badge
        key={entry.member.userId}
        label={describeAttendance(entry)}
        tone={TONES[entry.kind]}
        testID={testID ? `${testID}-${entry.member.userId}` : undefined}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
