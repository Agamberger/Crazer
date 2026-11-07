import { UserSearchResult } from '../types';

export const DEFAULT_USER_DISPLAY_NAME = 'Utilisateur';

/**
 * Nom à afficher pour un utilisateur : nom complet, sinon partie locale de l'email
 * (l'email peut être masqué par le serveur), sinon un libellé générique.
 */
export const getUserDisplayName = (
  user: Pick<UserSearchResult, 'fullName' | 'email'>,
): string => {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;
  const localPart = user.email?.split('@')[0]?.trim();
  return localPart || DEFAULT_USER_DISPLAY_NAME;
};
