import { act, renderHook, waitFor } from '@testing-library/react-native';
import { OutingRow } from '@/shared/types';
import { useStepBaseDate } from '../hooks/useStepBaseDate';
import { resolveStepBaseDate } from '../services/stepBaseDate';

jest.mock('../services/stepBaseDate', () => ({ resolveStepBaseDate: jest.fn() }));

const resolve = resolveStepBaseDate as jest.Mock;

const makeOuting = (overrides: Partial<OutingRow>): OutingRow => ({
  id: 'o1',
  title: 'Sortie',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...overrides,
});

describe('useStepBaseDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the outing date synchronously without any lookup', () => {
    const { result } = renderHook(() =>
      useStepBaseDate(makeOuting({ start_date: '2026-11-10T18:00:00.000Z' })),
    );
    expect(result.current?.toISOString()).toBe('2026-11-10T18:00:00.000Z');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('returns null while an undated outing is resolved, then the resolved date', async () => {
    resolve.mockResolvedValue(new Date('2026-11-14T18:00:00.000Z'));
    const { result } = renderHook(() => useStepBaseDate(makeOuting({})));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current?.toISOString()).toBe('2026-11-14T18:00:00.000Z'));
  });

  it('does not look up again when the outing object changes but not its id or date', async () => {
    resolve.mockResolvedValue(new Date('2026-11-14T18:00:00.000Z'));
    const { result, rerender } = renderHook(
      ({ outing }: { outing: OutingRow }) => useStepBaseDate(outing),
      { initialProps: { outing: makeOuting({}) } },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    rerender({ outing: makeOuting({ title: 'Renommée' }) });
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('returns null again (no stale date) when switching to another undated outing', async () => {
    let release: (date: Date) => void = () => undefined;
    resolve
      .mockResolvedValueOnce(new Date('2026-11-14T18:00:00.000Z'))
      .mockReturnValueOnce(new Promise<Date>((r) => (release = r)));
    const { result, rerender } = renderHook(
      ({ outing }: { outing: OutingRow }) => useStepBaseDate(outing),
      { initialProps: { outing: makeOuting({ id: 'o1' }) } },
    );
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ outing: makeOuting({ id: 'o2' }) });
    expect(result.current).toBeNull();
    await act(async () => release(new Date('2026-11-20T18:00:00.000Z')));
    expect(result.current?.toISOString()).toBe('2026-11-20T18:00:00.000Z');
  });
});
