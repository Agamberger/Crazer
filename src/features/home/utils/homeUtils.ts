import { OutingRow } from '@/shared/types';

/** Une sortie est « active » tant qu'elle n'est ni terminée ni annulée. */
export const isActiveOuting = (outing: OutingRow): boolean =>
  outing.status !== 'done' && outing.status !== 'cancelled';

const toTime = (value: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * Prochaine sortie à mettre en avant sur l'accueil :
 * la sortie active la plus proche à venir, sinon une sortie en cours,
 * sinon la sortie active la plus récemment passée (pour ne jamais masquer un brouillon).
 */
export const getNextOuting = (outings: OutingRow[], now: Date = new Date()): OutingRow | null => {
  const active = outings.filter(isActiveOuting);
  if (active.length === 0) return null;

  const nowTime = now.getTime();
  const upcoming = active
    .filter((outing) => {
      const time = toTime(outing.start_date);
      return time !== null && time >= nowTime;
    })
    .sort((a, b) => (toTime(a.start_date) ?? 0) - (toTime(b.start_date) ?? 0));
  if (upcoming.length > 0) return upcoming[0];

  const ongoing = active.find((outing) => outing.status === 'ongoing');
  if (ongoing) return ongoing;

  return [...active].sort(
    (a, b) => (toTime(b.start_date) ?? 0) - (toTime(a.start_date) ?? 0),
  )[0];
};

/** Max outings listed in the « À venir » section. */
export const UPCOMING_OUTINGS_LIMIT = 5;

/**
 * Active outings still to come, soonest first. `excludeId` skips the outing already
 * highlighted as « Prochaine sortie ».
 */
export const getUpcomingOutings = (
  outings: OutingRow[],
  now: Date = new Date(),
  excludeId?: string | null,
  limit: number = UPCOMING_OUTINGS_LIMIT,
): OutingRow[] => {
  const nowTime = now.getTime();
  return outings
    .filter((outing) => {
      const time = toTime(outing.start_date);
      return isActiveOuting(outing) && outing.id !== excludeId && time !== null && time >= nowTime;
    })
    .sort((a, b) => (toTime(a.start_date) ?? 0) - (toTime(b.start_date) ?? 0))
    .slice(0, limit);
};

/** « mer. 11 nov. · 18:00 » */
export const formatUpcomingDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
};

/** « Bonjour » de 5 h à 18 h, « Bonsoir » sinon. */
export const getGreeting = (date: Date = new Date()): string => {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
};

/** Prénom à afficher : premier mot du nom complet, sinon partie locale de l'email. */
export const getFirstName = (fullName?: string | null, email?: string | null): string => {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  const local = email?.split('@')[0]?.trim();
  return local || '';
};
