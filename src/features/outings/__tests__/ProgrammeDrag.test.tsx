import React from 'react';
import { View } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  ProgrammeDragProvider,
  useProgrammeDrag,
} from '../components/hub/what/ProgrammeDragContext';
import { Rect } from '../utils/dragUtils';

type DragValue = NonNullable<ReturnType<typeof useProgrammeDrag>>;
type ViewInstance = React.ComponentRef<typeof View>;

/** A slot whose window position is known, standing for a mounted drop zone. */
const fakeSlot = (rect: Rect): ViewInstance =>
  ({
    measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(rect.x, rect.y, rect.width, rect.height),
  }) as unknown as ViewInstance;

let drag: DragValue | null = null;

const Probe: React.FC = () => {
  drag = useProgrammeDrag();
  return null;
};

const renderProvider = (onDrop: (activityId: string, index: number) => void) =>
  render(
    <ProgrammeDragProvider onDrop={onDrop}>
      <Probe />
    </ProgrammeDragProvider>,
  );

const current = (): DragValue => {
  if (!drag) throw new Error('drag context not mounted');
  return drag;
};

const ACTIVITY = { id: 'a1', title: 'Glace' };

beforeEach(() => {
  drag = null;
});

describe('ProgrammeDragProvider', () => {
  it('drops the activity on the slot under the finger', async () => {
    const onDrop = jest.fn();
    renderProvider(onDrop);
    act(() => {
      current().registerSlot(0, fakeSlot({ x: 0, y: 100, width: 300, height: 44 }));
      current().registerSlot(1, fakeSlot({ x: 0, y: 300, width: 300, height: 44 }));
      current().startDrag(ACTIVITY, 50, 20);
    });
    expect(current().dragged).toEqual(ACTIVITY);

    await waitFor(() => {
      act(() => current().moveDrag(50, 320));
      expect(current().hoveredIndex).toBe(1);
    });
    act(() => current().endDrag());

    expect(onDrop).toHaveBeenCalledWith('a1', 1);
    expect(current().dragged).toBeNull();
    expect(current().hoveredIndex).toBeNull();
  });

  it('does not drop outside every slot', async () => {
    const onDrop = jest.fn();
    renderProvider(onDrop);
    act(() => {
      current().registerSlot(0, fakeSlot({ x: 0, y: 100, width: 300, height: 44 }));
      current().startDrag(ACTIVITY, 50, 20);
    });
    await waitFor(() => {
      act(() => current().moveDrag(50, 600));
      expect(current().hoveredIndex).toBeNull();
    });
    act(() => current().endDrag());
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('a cancelled drag drops nothing', async () => {
    const onDrop = jest.fn();
    renderProvider(onDrop);
    act(() => {
      current().registerSlot(0, fakeSlot({ x: 0, y: 100, width: 300, height: 44 }));
      current().startDrag(ACTIVITY, 50, 20);
    });
    await waitFor(() => {
      act(() => current().moveDrag(50, 120));
      expect(current().hoveredIndex).toBe(0);
    });
    act(() => current().cancelDrag());
    expect(onDrop).not.toHaveBeenCalled();
    expect(current().dragged).toBeNull();
  });

  it('stops the auto-scroll timer when unmounted during a drag', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderProvider(jest.fn());
    act(() => current().startDrag(ACTIVITY, 50, 20));
    clearIntervalSpy.mockClear();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
