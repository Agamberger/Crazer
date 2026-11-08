import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFriendsStore } from '@/features/profil';
import { useToastStore } from '@/shared/store/useToastStore';
import { CreateOutingWizard } from '../components/scheduling/CreateOutingWizard';
import { useOutingCreationStore } from '../store/useOutingCreationStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DEFAULT_TIME_RANGE, buildStartDate, toDayKey } from '../utils/availabilityUtils';

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
    expect(getByTestId('wizard-progress').props.children.join('')).toBe('Étape 1/5');
  });

  it('enchaîne nom → type → invités → jours → dispos puis crée la sortie', async () => {
    createOutingWithInvites.mockResolvedValue('outing-1');
    const { getByTestId, getByText } = renderWizard();

    fireEvent.changeText(getByTestId('input-outing-name'), 'Glouglou');
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Quel genre de sortie ?')).toBeTruthy();

    fireEvent.press(getByTestId('outing-type-precise'));
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Avec qui ?')).toBeTruthy();

    fireEvent.press(getByTestId('checkbox-friend-bob'));
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Quand ?')).toBeTruthy();

    fireEvent.press(getByTestId(`day-cell-${new Date().getDate()}`));
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByText('Mes dispos')).toBeTruthy();
    expect(getByTestId(`slot-${today}-start`)).toBeTruthy();

    fireEvent.press(getByText('Créer la sortie'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('outing-1'));
    expect(createOutingWithInvites).toHaveBeenCalledWith({
      title: 'Glouglou',
      outingType: 'precise',
      days: [today],
      slots: { [today]: DEFAULT_TIME_RANGE },
      inviteeIds: ['bob'],
    });
    expect(useOutingCreationStore.getState().title).toBe('');
    expect(useToastStore.getState().queue).toContainEqual(
      expect.objectContaining({ tone: 'success', message: 'Invitation envoyée à 1 ami.' }),
    );
  });

  it('le type de sortie doit être choisi avant de continuer', () => {
    useOutingCreationStore.setState({ stepIndex: 1, title: 'Glouglou' });
    const { getByTestId } = renderWizard();

    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByTestId('wizard-progress').props.children.join('')).toBe('Étape 2/5');

    fireEvent.press(getByTestId('outing-type-holidays'));
    expect(useOutingCreationStore.getState().outingType).toBe('holidays');
    fireEvent.press(getByTestId('btn-wizard-next'));
    expect(getByTestId('wizard-progress').props.children.join('')).toBe('Étape 3/5');
  });

  it('« Quand ? » permet de choisir un jour dans un mois suivant', () => {
    useOutingCreationStore.setState({ stepIndex: 3, title: 'Glouglou' });
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
      stepIndex: 4,
      title: 'Glouglou',
      days: [today],
      slots: { [today]: DEFAULT_TIME_RANGE },
    });
    const { getByText } = renderWizard();

    fireEvent.press(getByText('Créer la sortie'));

    await waitFor(() =>
      expect(useToastStore.getState().queue).toContainEqual(
        expect.objectContaining({ tone: 'error' }),
      ),
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(useOutingCreationStore.getState().title).toBe('Glouglou');
  });

  describe('autour d’un lieu', () => {
    const place = { id: 'place-uuid-1', name: 'Burger Gourmet' };
    const addPlannedOuting = jest.fn();
    const renderWithPlace = () =>
      render(<CreateOutingWizard onCreated={onCreated} onClose={onClose} place={place} />);
    // The wizard resets the draft when it opens around a place: fill it once mounted.
    const fillDraft = () =>
      act(() => {
        useOutingCreationStore.setState({
          stepIndex: 4,
          title: 'Burger Gourmet',
          days: [today],
          slots: { [today]: DEFAULT_TIME_RANGE },
        });
      });

    beforeEach(() => {
      addPlannedOuting.mockReset();
      useOutingsStore.setState({ addPlannedOuting });
    });

    test('préremplit le titre avec le nom du lieu et annonce la première étape', () => {
      useOutingCreationStore.setState({ title: 'Ancien brouillon', stepIndex: 2 });
      const { getByTestId, getByText } = renderWithPlace();

      expect(getByTestId('input-outing-name').props.value).toBe('Burger Gourmet');
      expect(getByText('📍 Burger Gourmet sera ajouté comme première étape.')).toBeTruthy();
      expect(useOutingCreationStore.getState().stepIndex).toBe(0);
    });

    test('ajoute le lieu comme première étape au début du créneau de l’organisateur', async () => {
      createOutingWithInvites.mockResolvedValue('outing-1');
      addPlannedOuting.mockResolvedValue({});
      const { getByText } = renderWithPlace();
      fillDraft();

      fireEvent.press(getByText('Créer la sortie'));

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith('outing-1'));
      expect(addPlannedOuting).toHaveBeenCalledWith({
        outing_id: 'outing-1',
        place_id: 'place-uuid-1',
        title: 'Burger Gourmet',
        scheduled_for: buildStartDate(today, DEFAULT_TIME_RANGE.start),
        duration_min: 60,
        status: 'pending',
        created_by: 'alice',
      });
    });

    test('la sortie reste créée avec un avertissement si l’étape ne peut pas être ajoutée', async () => {
      createOutingWithInvites.mockResolvedValue('outing-1');
      addPlannedOuting.mockRejectedValue(new Error('RLS'));
      const { getByText } = renderWithPlace();
      fillDraft();

      fireEvent.press(getByText('Créer la sortie'));

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith('outing-1'));
      expect(useToastStore.getState().queue).toContainEqual(
        expect.objectContaining({ tone: 'warning', title: 'Burger Gourmet' }),
      );
    });

    test('sans lieu, aucune étape n’est ajoutée', async () => {
      createOutingWithInvites.mockResolvedValue('outing-1');
      useOutingCreationStore.setState({
        stepIndex: 4,
        title: 'Glouglou',
        days: [today],
        slots: { [today]: DEFAULT_TIME_RANGE },
      });
      const { getByText, queryByTestId } = renderWizard();

      expect(queryByTestId('wizard-place-banner')).toBeNull();
      fireEvent.press(getByText('Créer la sortie'));

      await waitFor(() => expect(onCreated).toHaveBeenCalled());
      expect(addPlannedOuting).not.toHaveBeenCalled();
    });
  });
});
