import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { CreateOutingScreen } from '../components/hub/CreateOutingScreen';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'alice' } }),
}));

describe('CreateOutingScreen', () => {
  const createOutingWithInvites = jest.fn();
  const addPlannedOuting = jest.fn();
  const onCreated = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useToastStore.getState().clear();
    useOutingSchedulingStore.setState({ createOutingWithInvites, isSubmitting: false });
    useOutingsStore.setState({ addPlannedOuting });
  });

  it('crée la sortie avec son seul nom puis ouvre le hub', async () => {
    createOutingWithInvites.mockResolvedValue('o1');
    const { getByTestId, queryByTestId } = render(
      <CreateOutingScreen onCreated={onCreated} onClose={onClose} />,
    );
    expect(queryByTestId('wizard-progress')).toBeNull();
    expect(getByTestId('btn-create-outing')).toBeDisabled();

    fireEvent.changeText(getByTestId('input-outing-name'), '  Glouglou ');
    fireEvent.press(getByTestId('btn-create-outing'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('o1'));
    expect(createOutingWithInvites).toHaveBeenCalledWith({
      title: '  Glouglou ',
      outingType: null,
      days: [],
      slots: {},
      inviteeIds: [],
    });
    expect(addPlannedOuting).not.toHaveBeenCalled();
  });

  it('préremplit le nom avec le lieu et l’ajoute comme première étape', async () => {
    createOutingWithInvites.mockResolvedValue('o1');
    addPlannedOuting.mockResolvedValue({});
    const { getByTestId } = render(
      <CreateOutingScreen
        onCreated={onCreated}
        onClose={onClose}
        place={{ id: 'p1', name: 'Burger Gourmet' }}
      />,
    );
    expect(getByTestId('create-place-banner')).toBeTruthy();
    expect(getByTestId('input-outing-name').props.value).toBe('Burger Gourmet');

    fireEvent.press(getByTestId('btn-create-outing'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('o1'));
    expect(addPlannedOuting).toHaveBeenCalledWith(
      expect.objectContaining({
        outing_id: 'o1',
        place_id: 'p1',
        title: 'Burger Gourmet',
        duration_min: 60,
        status: 'pending',
        created_by: 'alice',
      }),
    );
  });

  it('crée la sortie même si le lieu n’a pas pu être ajouté, avec un avertissement', async () => {
    createOutingWithInvites.mockResolvedValue('o1');
    addPlannedOuting.mockRejectedValue(new Error('RLS'));
    const { getByTestId } = render(
      <CreateOutingScreen
        onCreated={onCreated}
        onClose={onClose}
        place={{ id: 'p1', name: 'Bar' }}
      />,
    );
    fireEvent.press(getByTestId('btn-create-outing'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('o1'));
    expect(useToastStore.getState().queue[0]?.tone).toBe('warning');
  });

  it('garde le nom et affiche une erreur si la création échoue', async () => {
    createOutingWithInvites.mockRejectedValue(new Error('network'));
    const { getByTestId } = render(
      <CreateOutingScreen onCreated={onCreated} onClose={onClose} initialTitle="Bowling" />,
    );
    fireEvent.press(getByTestId('btn-create-outing'));

    await waitFor(() => expect(useToastStore.getState().queue[0]?.tone).toBe('error'));
    expect(onCreated).not.toHaveBeenCalled();
    expect(getByTestId('input-outing-name').props.value).toBe('Bowling');
  });

  it('se ferme depuis l’en-tête', () => {
    const { getByTestId } = render(<CreateOutingScreen onCreated={onCreated} onClose={onClose} />);
    fireEvent.press(getByTestId('btn-wizard-back'));
    expect(onClose).toHaveBeenCalled();
  });
});
