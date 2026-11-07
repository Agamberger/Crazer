import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, GestureResponderHandlers, PanResponder } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SHEET_COLLAPSED_HEIGHT = 270;
export const SHEET_EXPANDED_HEIGHT = Math.max(300, SCREEN_HEIGHT - 280);
const MID_POINT = (SHEET_COLLAPSED_HEIGHT + SHEET_EXPANDED_HEIGHT) / 2;
const SPRING = { useNativeDriver: false, bounciness: 4 } as const;

export interface PlaceSheetGesture {
  /** Hauteur animée à appliquer à la fiche. */
  animatedHeight: Animated.Value;
  isExpanded: boolean;
  toggleExpand: () => void;
  /** Handlers à étaler sur la vue animée pour le glisser vertical. */
  panHandlers: GestureResponderHandlers;
}

const clampHeight = (height: number) =>
  Math.min(Math.max(height, SHEET_COLLAPSED_HEIGHT), SHEET_EXPANDED_HEIGHT);

/**
 * Gère l'ouverture / fermeture de la fiche d'un lieu : glisser vertical progressif,
 * bascule au tap et progression (0 → 1) partagée via `expandAnim` avec l'écran carte.
 */
export const usePlaceSheetGesture = (
  placeId: string,
  expandAnim?: Animated.Value,
): PlaceSheetGesture => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);
  isExpandedRef.current = isExpanded;

  const animatedHeight = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;
  const startHeightRef = useRef(SHEET_COLLAPSED_HEIGHT);

  // Réinitialiser la hauteur lors du changement de lieu
  useEffect(() => {
    setIsExpanded(false);
    animatedHeight.setValue(SHEET_COLLAPSED_HEIGHT);
    expandAnim?.setValue(0);
  }, [placeId, animatedHeight, expandAnim]);

  const updateExpandProgress = (height: number) => {
    if (!expandAnim) return;
    const progress =
      (height - SHEET_COLLAPSED_HEIGHT) / (SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT);
    expandAnim.setValue(Math.min(Math.max(progress, 0), 1));
  };

  const animateTo = (expanded: boolean) => {
    const heightAnimation = Animated.spring(animatedHeight, {
      toValue: expanded ? SHEET_EXPANDED_HEIGHT : SHEET_COLLAPSED_HEIGHT,
      ...SPRING,
    });
    if (expandAnim) {
      Animated.parallel([
        heightAnimation,
        Animated.spring(expandAnim, { toValue: expanded ? 1 : 0, ...SPRING }),
      ]).start();
    } else {
      heightAnimation.start();
    }
  };

  const setExpandedAnimated = (expanded: boolean) => {
    setIsExpanded(expanded);
    animateTo(expanded);
  };

  const toggleExpand = () => setExpandedAnimated(!isExpandedRef.current);

  // PanResponder capturant le glissement vertical progressif sur toute la fiche
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: () => {
        startHeightRef.current = isExpandedRef.current
          ? SHEET_EXPANDED_HEIGHT
          : SHEET_COLLAPSED_HEIGHT;
      },
      onPanResponderMove: (_, { dy }) => {
        const height = clampHeight(startHeightRef.current - dy);
        animatedHeight.setValue(height);
        updateExpandProgress(height);

        if (height > MID_POINT && !isExpandedRef.current) setIsExpanded(true);
        else if (height <= MID_POINT && isExpandedRef.current) setIsExpanded(false);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const finalHeight = startHeightRef.current - dy;
        const shouldExpand = vy < -0.3 || (vy <= 0.3 && finalHeight > MID_POINT);
        setExpandedAnimated(shouldExpand);
      },
    }),
  ).current;

  return { animatedHeight, isExpanded, toggleExpand, panHandlers: panResponder.panHandlers };
};
