import React, { useMemo, useRef } from 'react';
import { PanResponder, ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, radii, spacing, typography } from '@/shared/constants/theme';
import { useProgrammeDrag } from './ProgrammeDragContext';

export interface ActivityDragHandleProps {
  activityId: string;
  title: string;
}

/** « ⠿ » handle of a pool card: drag it onto the programme to place the activity there. */
export const ActivityDragHandle: React.FC<ActivityDragHandleProps> = ({ activityId, title }) => {
  const drag = useProgrammeDrag();
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const responder = useMemo(() => {
    const activity = { id: activityId, title };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) =>
        dragRef.current?.startDrag(activity, event.nativeEvent.pageX, event.nativeEvent.pageY),
      onPanResponderMove: (_event, gesture) =>
        dragRef.current?.moveDrag(gesture.moveX, gesture.moveY),
      onPanResponderRelease: () => dragRef.current?.endDrag(),
      onPanResponderTerminate: () => dragRef.current?.cancelDrag(),
    });
  }, [activityId, title]);

  if (!drag) return null;

  return (
    <View
      {...responder.panHandlers}
      style={styles.handle}
      accessibilityLabel={`Glisser ${title} vers le programme`}
      testID={`drag-handle-${activityId}`}
    >
      <AppText color="secondary" style={styles.handleText}>
        ⠿
      </AppText>
    </View>
  );
};

export interface ProgrammeDropSlotProps {
  /** Drop position in the programme (0 = before the first step). */
  index: number;
}

/** Drop zone between two steps of the programme, shown while an activity is dragged. */
export const ProgrammeDropSlot: React.FC<ProgrammeDropSlotProps> = ({ index }) => {
  const drag = useProgrammeDrag();
  if (!drag?.dragged) return null;
  const isHovered = drag.hoveredIndex === index;

  return (
    <View
      ref={(view) => drag.registerSlot(index, view)}
      style={[styles.slot, isHovered && styles.slotHovered]}
      testID={`programme-drop-slot-${index}`}
    >
      <AppText variant="caption" color={isHovered ? 'accent' : 'secondary'}>
        {isHovered ? `Déposer « ${drag.dragged.title} » ici` : 'Déposer ici'}
      </AppText>
    </View>
  );
};

/** Props of `ProgrammeDragScrollView`: the scroll state is driven by the drag. */
export type ProgrammeDragScrollViewProps = Omit<
  ScrollViewProps,
  'scrollEnabled' | 'onScroll' | 'onContentSizeChange' | 'onLayout'
>;

/** The page's ScrollView: frozen while dragging, and scrolled by the drag near its edges. */
export const ProgrammeDragScrollView: React.FC<ProgrammeDragScrollViewProps> = ({
  children,
  ...props
}) => {
  const drag = useProgrammeDrag();
  return (
    <ScrollView
      {...props}
      ref={(view) => drag?.registerScrollView(view)}
      scrollEnabled={!drag?.dragged}
      onScroll={(event) => drag?.onScrollOffset(event.nativeEvent.contentOffset.y)}
      onContentSizeChange={(_width, height) => drag?.onScrollBounds({ contentHeight: height })}
      onLayout={(event) =>
        drag?.onScrollBounds({ viewportHeight: event.nativeEvent.layout.height })
      }
      scrollEventThrottle={32}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  handleText: {
    fontSize: typography.fontSizes.lg,
  },
  slot: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    marginVertical: spacing.xs,
    minHeight: 44,
  },
  slotHovered: {
    backgroundColor: colors.infoBackground,
    borderColor: colors.primary,
  },
});
