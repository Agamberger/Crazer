import { colors } from '@/shared/constants/theme';

export interface PlaceCategoryLabel {
  name: string;
  badgeColor: string;
}

/** Libellé et couleur de badge par catégorie de lieu (fiche lieu, ajout à une sortie). */
export const PLACE_CATEGORY_LABELS: Record<string, PlaceCategoryLabel> = {
  resto: { name: 'Restaurant', badgeColor: colors.secondary },
  bar: { name: 'Bar & Lounge', badgeColor: colors.accent },
  activite: { name: 'Activité', badgeColor: colors.primary },
  nature: { name: 'Outdoor', badgeColor: colors.success },
  culture: { name: 'Culture', badgeColor: colors.warning },
  all: { name: 'Lieu', badgeColor: colors.primary },
};

export const getPlaceCategoryLabel = (category: string): PlaceCategoryLabel =>
  PLACE_CATEGORY_LABELS[category] || PLACE_CATEGORY_LABELS.all;
