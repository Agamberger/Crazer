import { renderHook } from '@testing-library/react-native';
import { OutingRow } from '@/shared/types';
import { filterAttendedOutings, useVisibleOutings } from '../hooks/useVisibleOutings';
import { useOutingMembers } from '../hooks/useOutingMembers';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

const outing = (id: string): OutingRow => ({
  id,
  title: id,
  description: null,
  start_date: '2026-11-10T18:00:00Z',
  created_by: 'alice',
  status: 'planned',
  cover_image: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
});

describe('filterAttendedOutings', () => {
  it('retire les sorties non suivies sans toucher aux autres', () => {
    const outings = [outing('a'), outing('b'), outing('c')];
    expect(filterAttendedOutings(outings, ['b']).map((o) => o.id)).toEqual(['a', 'c']);
    expect(filterAttendedOutings(outings, [])).toEqual(outings);
  });
});

describe('useVisibleOutings', () => {
  beforeEach(() => {
    useOutingsStore.setState({ outings: [outing('mine'), outing('invited'), outing('declined')] });
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: ['invited', 'declined'] });
  });

  it('exclut les invitations en attente et les sorties refusées', () => {
    const { result } = renderHook(() => useVisibleOutings());
    expect(result.current.map((o) => o.id)).toEqual(['mine']);
  });

  it('réagit à un nouveau refus', () => {
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: [] });
    const { result } = renderHook(() => useVisibleOutings());
    expect(result.current).toHaveLength(3);
  });
});

describe('useOutingMembers', () => {
  const fetchScheduling = jest.fn();

  beforeEach(() => {
    fetchScheduling.mockReset();
    useOutingSchedulingStore.setState({ schedulingByOutingId: {}, fetchScheduling });
  });

  it('charge les membres de la sortie et retourne ceux du store', () => {
    const members = [
      { userId: 'alice', displayName: 'Alice', avatarUrl: null, status: 'accepted' as const, isOrganizer: true },
    ];
    useOutingSchedulingStore.setState({
      schedulingByOutingId: { o1: { days: [], availabilities: [], members } },
    });

    const { result } = renderHook(() => useOutingMembers({ id: 'o1', created_by: 'alice' }));

    expect(fetchScheduling).toHaveBeenCalledWith({ id: 'o1', created_by: 'alice' });
    expect(result.current).toEqual(members);
  });

  it('ne charge rien sans sortie et retourne une liste vide stable', () => {
    const { result, rerender } = renderHook(() => useOutingMembers(null));
    const first = result.current;
    rerender({});
    expect(fetchScheduling).not.toHaveBeenCalled();
    expect(first).toEqual([]);
    expect(result.current).toBe(first);
  });
});
