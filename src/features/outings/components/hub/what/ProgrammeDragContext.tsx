import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { findSlotAt, nextScrollOffset, Rect, scrollStepNearEdge } from '../../../utils/dragUtils';

type ViewInstance = React.ComponentRef<typeof View>;
type ScrollViewInstance = React.ComponentRef<typeof ScrollView>;

/** Activity of the pool being dragged towards the programme. */
export interface DraggedActivity {
  id: string;
  title: string;
}

interface ProgrammeDragValue {
  dragged: DraggedActivity | null;
  /** Drop position under the finger, `null` when outside every slot. */
  hoveredIndex: number | null;
  startDrag: (activity: DraggedActivity, pageX: number, pageY: number) => void;
  moveDrag: (pageX: number, pageY: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  registerSlot: (index: number, view: ViewInstance | null) => void;
  registerScrollView: (view: ScrollViewInstance | null) => void;
  onScrollOffset: (offsetY: number) => void;
  /** Height of the scrolled content and of the visible page, to clamp the auto-scroll. */
  onScrollBounds: (bounds: Partial<ScrollBounds>) => void;
}

interface ScrollBounds {
  contentHeight: number;
  viewportHeight: number;
}

const ProgrammeDragContext = createContext<ProgrammeDragValue | null>(null);

/** The drag state, or `null` outside a `ProgrammeDragProvider` (drag-and-drop disabled). */
export const useProgrammeDrag = (): ProgrammeDragValue | null => useContext(ProgrammeDragContext);

export interface ProgrammeDragProviderProps {
  children: React.ReactNode;
  /** Called when an activity is released on a drop slot of the programme. */
  onDrop: (activityId: string, index: number) => void;
}

const AUTO_SCROLL_INTERVAL_MS = 50;

const measure = (view: ViewInstance): Promise<Rect> =>
  new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });

/**
 * Drag-and-drop of pool activities into the programme, inside one scrolling page: the pool
 * cards start a drag from their handle, the programme shows drop slots, a ghost card follows
 * the finger and the page scrolls when the finger nears its top or bottom edge.
 */
export const ProgrammeDragProvider: React.FC<ProgrammeDragProviderProps> = ({
  children,
  onDrop,
}) => {
  const [dragged, setDragged] = useState<DraggedActivity | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<ViewInstance>(null);
  const rootRect = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const slotViews = useRef(new Map<number, ViewInstance>());
  const slotRects = useRef(new Map<number, Rect>());
  const scrollView = useRef<ScrollViewInstance | null>(null);
  const scrollOffset = useRef(0);
  const scrollBounds = useRef<ScrollBounds>({ contentHeight: 0, viewportHeight: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const draggedRef = useRef<DraggedActivity | null>(null);
  const hoveredRef = useRef<number | null>(null);

  const measureSlots = useCallback(async () => {
    const entries = await Promise.all(
      [...slotViews.current.entries()].map(
        async ([index, view]) => [index, await measure(view)] as const,
      ),
    );
    slotRects.current = new Map(entries);
  }, []);

  const updateHover = useCallback(() => {
    const index = findSlotAt(slotRects.current, pointer.current.x, pointer.current.y);
    hoveredRef.current = index;
    setHoveredIndex(index);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current) clearInterval(autoScroll.current);
    autoScroll.current = null;
  }, []);

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const isDragging = dragged !== null;
  useEffect(() => {
    if (!isDragging || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const preventSelection = (event: Event) => event.preventDefault();
    document.getSelection()?.removeAllRanges();
    document.addEventListener('selectstart', preventSelection);
    return () => document.removeEventListener('selectstart', preventSelection);
  }, [isDragging]);

  const tickAutoScroll = useCallback(() => {
    const step = scrollStepNearEdge(rootRect.current, pointer.current.y);
    if (step === 0 || !scrollView.current) return;
    const { contentHeight, viewportHeight } = scrollBounds.current;
    const next = nextScrollOffset(scrollOffset.current, step, contentHeight, viewportHeight);
    if (next === scrollOffset.current) return;
    scrollOffset.current = next;
    scrollView.current.scrollTo({ y: next, animated: false });
    void measureSlots().then(updateHover);
  }, [measureSlots, updateHover]);

  const startDrag = useCallback(
    (activity: DraggedActivity, pageX: number, pageY: number) => {
      draggedRef.current = activity;
      pointer.current = { x: pageX, y: pageY };
      setDragged(activity);
      if (rootRef.current) {
        void measure(rootRef.current).then((rect) => {
          rootRect.current = rect;
          setGhost({ x: pageX - rect.x, y: pageY - rect.y });
        });
      }
      requestAnimationFrame(() => void measureSlots().then(updateHover));
      stopAutoScroll();
      autoScroll.current = setInterval(tickAutoScroll, AUTO_SCROLL_INTERVAL_MS);
    },
    [measureSlots, updateHover, stopAutoScroll, tickAutoScroll],
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      pointer.current = { x: pageX, y: pageY };
      setGhost({ x: pageX - rootRect.current.x, y: pageY - rootRect.current.y });
      updateHover();
    },
    [updateHover],
  );

  const reset = useCallback(() => {
    stopAutoScroll();
    draggedRef.current = null;
    hoveredRef.current = null;
    setDragged(null);
    setHoveredIndex(null);
    setGhost(null);
  }, [stopAutoScroll]);

  const endDrag = useCallback(() => {
    const activity = draggedRef.current;
    const index = hoveredRef.current;
    reset();
    if (activity && index !== null) onDrop(activity.id, index);
  }, [onDrop, reset]);

  const value = useMemo<ProgrammeDragValue>(
    () => ({
      dragged,
      hoveredIndex,
      startDrag,
      moveDrag,
      endDrag,
      cancelDrag: reset,
      registerSlot: (index, view) => {
        if (view) slotViews.current.set(index, view);
        else slotViews.current.delete(index);
      },
      registerScrollView: (view) => {
        scrollView.current = view;
      },
      onScrollOffset: (offsetY) => {
        scrollOffset.current = offsetY;
      },
      onScrollBounds: (bounds) => {
        scrollBounds.current = { ...scrollBounds.current, ...bounds };
      },
    }),
    [dragged, hoveredIndex, startDrag, moveDrag, endDrag, reset],
  );

  return (
    <ProgrammeDragContext.Provider value={value}>
      <View ref={rootRef} style={styles.root}>
        {children}
        {dragged && ghost ? (
          <View
            pointerEvents="none"
            style={[styles.ghost, { left: spacing.md, top: ghost.y - spacing.lg }]}
            testID="programme-drag-ghost"
          >
            <Card variant="elevated" style={styles.ghostCard}>
              <AppText weight="semibold">⠿ {dragged.title}</AppText>
            </Card>
          </View>
        ) : null}
      </View>
    </ProgrammeDragContext.Provider>
  );
};

const styles = StyleSheet.create({
  ghost: {
    opacity: 0.9,
    position: 'absolute',
    right: spacing.md,
  },
  ghostCard: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  root: {
    flex: 1,
  },
});
