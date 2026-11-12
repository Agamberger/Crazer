import { act, renderHook } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { PlannedOutingRow } from '@/shared/types';
import { useOutingPlannedOutings } from '../hooks/useOutingPlannedOutings';

const mockFetchPlannedOutings = jest.fn();
const mockCreatePlannedOuting = jest.fn();
const mockSetSelectedPlannedOutingId = jest.fn();

const makeStep = (id: string, outingId: string): PlannedOutingRow => ({
  activity_id: null,
  id,
  outing_id: outingId,
  title: `Étape ${id}`,
  description: null,
  notes: null,
  scheduled_for: '2026-08-30T18:00:00.000Z',
  duration_min: 30,
  status: 'pending',
  place_id: null,
  created_by: 'user-1',
  created_at: '2026-08-24T20:00:00Z',
  updated_at: '2026-08-24T20:00:00Z',
});

const mockStoreSteps = [makeStep('a', 'out-1'), makeStep('b', 'out-2'), makeStep('c', 'out-1')];

jest.mock('../store/useOutingsStore', () => ({
  useOutingsStore: jest.fn((selector) =>
    selector({
      plannedOutings: mockStoreSteps,
      isLoadingPlannedOutings: true,
      fetchPlannedOutings: mockFetchPlannedOutings,
      createPlannedOuting: mockCreatePlannedOuting,
      setSelectedPlannedOutingId: mockSetSelectedPlannedOutingId,
    }),
  ),
}));

describe('useOutingPlannedOutings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMapStore.setState({ targetOutingId: null });
  });

  it('fetches and filters the store steps of the outing by default', () => {
    const { result } = renderHook(() => useOutingPlannedOutings('out-1'));

    expect(mockFetchPlannedOutings).toHaveBeenCalledWith('out-1');
    expect(result.current.plannedOutings.map((p) => p.id)).toEqual(['a', 'c']);
    expect(result.current.isLoading).toBe(true);
  });

  it('uses the steps supplied by the parent without touching the store', () => {
    const steps = [makeStep('x', 'out-1')];
    const { result } = renderHook(() =>
      useOutingPlannedOutings('out-1', { plannedOutings: steps }),
    );

    expect(mockFetchPlannedOutings).not.toHaveBeenCalled();
    expect(result.current.plannedOutings).toBe(steps);
    expect(result.current.isLoading).toBe(false);
  });

  it('creates the next numbered step and selects it through the parent callback', async () => {
    const created = makeStep('new', 'out-1');
    mockCreatePlannedOuting.mockResolvedValue(created);
    const onSelectPlannedOuting = jest.fn();
    const { result } = renderHook(() =>
      useOutingPlannedOutings('out-1', { onSelectPlannedOuting }),
    );

    await act(async () => {
      await result.current.addPlannedOuting();
    });

    expect(mockCreatePlannedOuting).toHaveBeenCalledWith('out-1', { title: 'Étape 3' });
    expect(onSelectPlannedOuting).toHaveBeenCalledWith(created);
  });

  it('delegates the step creation to the parent when provided', async () => {
    const onAddPlannedOuting = jest.fn();
    const { result } = renderHook(() => useOutingPlannedOutings('out-1', { onAddPlannedOuting }));

    await act(async () => {
      await result.current.addPlannedOuting();
    });

    expect(onAddPlannedOuting).toHaveBeenCalledTimes(1);
    expect(mockCreatePlannedOuting).not.toHaveBeenCalled();
  });

  it('targets the outing on the map and opens the map tab by default', () => {
    const { result } = renderHook(() => useOutingPlannedOutings('out-1'));

    act(() => result.current.addFromMap());

    expect(useMapStore.getState().targetOutingId).toBe('out-1');
    expect(useRouter().push).toHaveBeenCalledWith('/(tabs)/carte');
  });

  it('delegates "add from map" to the parent when provided', () => {
    const onAddFromMap = jest.fn();
    const { result } = renderHook(() => useOutingPlannedOutings('out-1', { onAddFromMap }));

    act(() => result.current.addFromMap());

    expect(onAddFromMap).toHaveBeenCalledTimes(1);
    expect(useMapStore.getState().targetOutingId).toBeNull();
  });

  it('selects a step in the store, or through the parent callback', () => {
    const step = makeStep('a', 'out-1');
    const { result } = renderHook(() => useOutingPlannedOutings('out-1'));
    act(() => result.current.selectPlannedOuting(step));
    expect(mockSetSelectedPlannedOutingId).toHaveBeenCalledWith('a');

    const onSelectPlannedOuting = jest.fn();
    const { result: withParent } = renderHook(() =>
      useOutingPlannedOutings('out-1', { onSelectPlannedOuting }),
    );
    act(() => withParent.current.selectPlannedOuting(step));
    expect(onSelectPlannedOuting).toHaveBeenCalledWith(step);
  });
});
