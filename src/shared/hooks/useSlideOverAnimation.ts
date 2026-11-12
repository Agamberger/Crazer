import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, useWindowDimensions } from 'react-native';

export const SLIDE_OVER_DURATION_MS = 260;

export interface SlideOverAnimation {
  /** True while the page is shown or still sliding out. */
  isMounted: boolean;
  /** Horizontal offset of the page: the window width when hidden, 0 when shown. */
  translateX: Animated.AnimatedInterpolation<number>;
}

/**
 * Drives a page that slides in from the right when `visible` becomes true and slides back out
 * before being unmounted when it becomes false.
 * @param visible whether the page should be shown.
 * @returns whether to render the page and its animated horizontal offset.
 */
export const useSlideOverAnimation = (visible: boolean): SlideOverAnimation => {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) setIsMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: SLIDE_OVER_DURATION_MS,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setIsMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });
  return { isMounted, translateX };
};
