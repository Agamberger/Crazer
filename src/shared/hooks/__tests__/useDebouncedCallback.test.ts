import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("n'exécute que le dernier appel après le délai", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.run('a');
      result.current.run('ab');
      result.current.run('abc');
      jest.advanceTimersByTime(299);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('abc');
  });

  it('cancel() annule un appel en attente', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.run('x');
      result.current.cancel();
      jest.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("annule l'appel en attente au démontage", () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.run('x');
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('utilise la version la plus récente du callback', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: (value: string) => void }) => useDebouncedCallback(cb, 300),
      { initialProps: { cb: first } },
    );

    act(() => {
      result.current.run('x');
    });
    rerender({ cb: second });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('x');
  });
});
