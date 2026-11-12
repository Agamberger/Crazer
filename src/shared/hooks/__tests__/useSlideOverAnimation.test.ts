import { act, renderHook } from '@testing-library/react-native';
import { SLIDE_OVER_DURATION_MS, useSlideOverAnimation } from '../useSlideOverAnimation';

interface HookProps {
  visible: boolean;
}

const renderSlideOver = (visible: boolean) =>
  renderHook(({ visible: isVisible }: HookProps) => useSlideOverAnimation(isVisible), {
    initialProps: { visible },
  });

describe('useSlideOverAnimation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is not mounted while hidden', () => {
    const { result } = renderSlideOver(false);
    expect(result.current.isMounted).toBe(false);
  });

  it('mounts as soon as it becomes visible', () => {
    const { result, rerender } = renderSlideOver(false);
    rerender({ visible: true });
    expect(result.current.isMounted).toBe(true);
  });

  it('stays mounted during the exit animation, then unmounts', () => {
    const { result, rerender } = renderSlideOver(true);
    rerender({ visible: false });
    expect(result.current.isMounted).toBe(true);

    act(() => {
      jest.advanceTimersByTime(SLIDE_OVER_DURATION_MS + 100);
    });
    expect(result.current.isMounted).toBe(false);
  });

  it('stays mounted when it is reopened during the exit animation', () => {
    const { result, rerender } = renderSlideOver(true);
    rerender({ visible: false });
    rerender({ visible: true });
    act(() => {
      jest.advanceTimersByTime(SLIDE_OVER_DURATION_MS + 100);
    });
    expect(result.current.isMounted).toBe(true);
  });
});
