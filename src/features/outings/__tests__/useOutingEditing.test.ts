import { act, renderHook } from '@testing-library/react-native';
import { toast } from '@/shared/store/useToastStore';
import { useOutingEditing } from '../hooks/useOutingEditing';
import { useOutingsStore } from '../store/useOutingsStore';

jest.mock('@/shared/store/useToastStore', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

const fetchPlannedOutings = jest.fn();
const updateOuting = jest.fn();
const updatePlannedOuting = jest.fn();
const deletePlannedOuting = jest.fn();

describe('useOutingEditing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      selectedOutingId: null,
      selectedPlannedOutingId: null,
      fetchPlannedOutings,
      updateOuting,
      updatePlannedOuting,
      deletePlannedOuting,
    });
  });

  it('loads the steps of the selected outing', () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1' });
    renderHook(() => useOutingEditing());

    expect(fetchPlannedOutings).toHaveBeenCalledWith('out-1');
  });

  it('does not reload the steps while a step is being edited', () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1', selectedPlannedOutingId: 'po-1' });
    renderHook(() => useOutingEditing());

    expect(fetchPlannedOutings).not.toHaveBeenCalled();
  });

  it('closes the outing form only when the update succeeds', async () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1' });
    const { result } = renderHook(() => useOutingEditing());

    updateOuting.mockResolvedValueOnce(null);
    await act(async () => {
      await result.current.handleUpdateOuting({ title: 'A' });
    });
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-1');

    updateOuting.mockResolvedValueOnce({ id: 'out-1' });
    await act(async () => {
      await result.current.handleUpdateOuting({ title: 'B' });
    });
    expect(updateOuting).toHaveBeenLastCalledWith('out-1', { title: 'B' });
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });

  it('closes the step form only when the update succeeds', async () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1', selectedPlannedOutingId: 'po-1' });
    const { result } = renderHook(() => useOutingEditing());

    updatePlannedOuting.mockResolvedValueOnce({ id: 'po-1' });
    await act(async () => {
      await result.current.handleUpdatePlannedOuting({ title: 'Billard' });
    });

    expect(updatePlannedOuting).toHaveBeenCalledWith('po-1', { title: 'Billard' });
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
  });

  it('shows a toast and keeps the step open when the delete fails', async () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1', selectedPlannedOutingId: 'po-1' });
    const { result } = renderHook(() => useOutingEditing());

    deletePlannedOuting.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.handleDeletePlannedOuting();
    });
    expect(toast.error).toHaveBeenCalled();
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBe('po-1');

    deletePlannedOuting.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.handleDeletePlannedOuting();
    });
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
  });

  it('cancels the outing and step edition', () => {
    useOutingsStore.setState({ selectedOutingId: 'out-1', selectedPlannedOutingId: 'po-1' });
    const { result } = renderHook(() => useOutingEditing());

    act(() => result.current.handleCancelPlannedEdit());
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
    act(() => result.current.handleCancelEdit());
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });
});
