import { OutingType } from '@/shared/types';
import { DayKey } from './scheduling';

/** Sections of the outing hub, each opened as a full-page panel. */
export type HubSection = 'when' | 'who' | 'how';

/** What the « Quand ? » row shows. */
export type WhenSummary =
  | { kind: 'date'; label: string }
  | { kind: 'days'; days: DayKey[]; daysWithCommonSlot: number }
  | { kind: 'empty' };

/** What the « Comment ? » row shows. */
export interface HowSummary {
  outingType: OutingType | null;
  answeredCount: number;
  attendingCount: number;
  proposalCount: number;
  chosenTitles: string[];
}

/** Result of the last action of a panel, shown inside it (a toast would be hidden by the modal). */
export interface PanelFeedback {
  tone: 'success' | 'error';
  message: string;
}
