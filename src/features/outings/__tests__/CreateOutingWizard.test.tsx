import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFriendsStore } from '@/features/profil';
import { useToastStore } from '@/shared/store/useToastStore';
import { CreateOutingWizard } from '../components/scheduling/CreateOutingWizard';
import { useOutingCreationStore } from '../store/useOutingCreationStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { DEFAULT_TIME_RANGE, toDayKey } from '../utils/availabilityUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'alice' } }),
}));

describe('CreateOutingWizard', () => {
  const today = toDayKey(new Date());
  const createOutingWithInvites = jest.fn();
  const fetchFriendsList = jest.fn();
  const onCreated = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useToastStore.getState().clear();
    useOutingCreationStore.getState().reset();
    useOutingSchedulingStore.setState({ createOutingWithInvites, isSubmitting: false });
    useFriendsStore.setState({
      friends: [
        { id: 'bob', email: null, fullName: 'Bob', avatarUrl: null, friendshipStatus: 'accepted' },
      ],
      isLoading: false,
      fetchFriendsList,
    });
  });

  const renderWizard = () =>
    render(<CreateOutingWizard onCreated={onCreated} onClose={onClose} />);

  it('charge les amis et ferme depuis la première étape', () => {
    const { getByTestId } = renderWizard();
    expect(fetchFriendsList).toHaveBeenCalledWith('alice');
    fireEvent.press(getByTestId('btn-wizard-back'));
    expect(onClose).toHaveBeenCalled();
  });

  it('bloque le passage à l’étape suivante sans nom', () => {
    const { getByTestId } = renderWizard();
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByTestId('wizard-progress').props.children.join('')).toBe('Étape 1/4');
  });

  it('enchaîne nom → jours → dispos → invités puis crée la sortie', async () => {
    createOutingWithInvites.mockResolvedValue('outing-1');
    const { getByTestId, getByText } = renderWizard();

    fireEvent.changeText(getByTestId('input-outing-name'), 'Glouglou');
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Quand ?')).toBeTruthy();

    fireEvent.press(getByTestId(`day-cell-${new Date().getDate()}`));
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Mes dispos')).toBeTruthy();
    expect(getByTestId(`slot-${today}-start`)).toBeTruthy();

    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Avec qui ?')).toBeTruthy();

    fireEvent.press(getByTestId('checkbox-friend-bob'));
    fireEvent.press(getByText("Envoyer l'invitation"));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('outing-1'));
    expect(createOutingWithInvites).toHaveBeenCalledWith({
      title: 'Glouglou',
      days: [today],
      slots: { [today]: DEFAULT_TIME_RANGE },
      inviteeIds: ['bob'],
    });
    expect(useOutingCreationStore.getState().title).toBe('');
    expect(useToastStore.getState().queue).toContainEqual(
      expect.objectContaining({ tone: 'success', message: 'Invitation envoyée à 1 ami.' }),
    );
  });

  it('« Quand ? » permet de choisir un jour dans un mois suivant', () => {
    useOutingCreationStore.setState({ stepIndex: 1, title: 'Glouglou' });
    const { getByTestId } = renderWizard();
    const now = new Date();
    const inTwoMonths = new Date(now.getFullYear(), now.getMonth() + 2, 15);

    fireEvent.press(getByTestId('btn-next-month'));
    fireEvent.press(getByTestId('btn-next-month'));
    fireEvent.press(getByTestId('day-cell-15'));

    expect(useOutingCreationStore.getState().days).toEqual([toDayKey(inTwoMonths)]);
    expect(getByTestId(`calendar-days-selected-${toDayKey(inTwoMonths)}`)).toBeTruthy();
  });

  it('revient à l’étape précédente', () => {
    const { getByTestId, getByText } = renderWizard();
    fireEvent.changeText(getByTestId('input-outing-name'), 'Glouglou');
    fireEvent.press(getByTestId('btn-wizard-next'));
    fireEvent.press(getByTestId('btn-wizard-back'));
    expect(getByText('On sort !')).toBeTruthy();
  });

  it('garde le brouillon et affiche une erreur si la création échoue', async () => {
    createOutingWithInvites.mockRejectedValue(new Error('network'));
    useOutingCreationStore.setState({
      stepIndex: 3,
      title: 'Glouglou',
      days: [today],
      slots: { [today]: DEFAULT_TIME_RANGE },
    });
    const { getByText } = renderWizard();

    fireEvent.press(getByText("Envoyer l'invitation"));

    await waitFor(() =>
      expect(useToastStore.getState().queue).toContainEqual(
        expect.objectContaining({ tone: 'error' }),
      ),
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(useOutingCreationStore.getState().title).toBe('Glouglou');
  });
});
