import { ChipOption } from '@/shared/components';
import {
  Constants,
  OUTING_STATUS_CONFIG,
  OutingStatus,
  PLANNED_OUTING_STATUS_CONFIG,
  PlannedOutingStatus,
} from '@/shared/types';

/** Durées proposées pour une étape (en minutes). */
export const DURATION_PRESETS: ChipOption<number>[] = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

const PLANNED_STATUS_ORDER: PlannedOutingStatus[] = [
  'pending',
  'confirmed',
  'skipped',
  'cancelled',
];

/** Statuts sélectionnables pour une étape, dans l'ordre d'affichage. */
export const PLANNED_STATUS_OPTIONS: ChipOption<PlannedOutingStatus>[] = PLANNED_STATUS_ORDER.map(
  (value) => ({ value, ...PLANNED_OUTING_STATUS_CONFIG[value] }),
);

/** Statuts sélectionnables pour une sortie, dans l'ordre de l'enum Postgres `outing_status`. */
export const OUTING_STATUS_OPTIONS: ChipOption<OutingStatus>[] =
  Constants.public.Enums.outing_status.map((status: OutingStatus) => ({
    value: status,
    label: OUTING_STATUS_CONFIG[status].label,
    emoji: OUTING_STATUS_CONFIG[status].emoji,
  }));
