import { act } from '@testing-library/react-native';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { authService } from '@/features/auth/services/authService';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { useOutingsStore } from '@/features/outings/store/useOutingsStore';
import { outingService } from '@/features/outings/services/outingService';
import { useFriendsStore } from '@/features/profil/store/useFriendsStore';
import { friendsService } from '@/features/profil/services/friendsService';
import { UserSearchResult } from '@/features/profil/types';
import { OutingRow } from '@/shared/types';

jest.mock('@/features/auth/services/authService', () => ({
  authService: {
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
    getCurrentSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

const outing: OutingRow = {
  id: 'out-1',
  title: 'Sortie privée',
  description: null,
  start_date: '2026-11-10T19:00:00Z',
  created_by: 'user-a',
  status: 'planned',
  cover_image: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const friendOfA: UserSearchResult = {
  id: 'user-b',
  email: 'b@crazer.app',
  fullName: 'B',
  avatarUrl: null,
  friendshipStatus: 'accepted',
};

const fillUserData = () => {
  useOutingsStore.setState({ outings: [outing], selectedOutingId: 'out-1' });
  useFriendsStore.setState({
    friends: [friendOfA],
    searchQuery: 'b',
  });
  useMapStore.setState({ targetOutingId: 'out-1', userLocation: { latitude: 1, longitude: 2 } });
};

const expectUserDataCleared = () => {
  expect(useOutingsStore.getState().outings).toEqual([]);
  expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  expect(useFriendsStore.getState().friends).toEqual([]);
  expect(useFriendsStore.getState().searchQuery).toBe('');
  expect(useMapStore.getState().targetOutingId).toBeNull();
  expect(useMapStore.getState().userLocation).toBeNull();
};

describe('Déconnexion : données du compte précédent effacées', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-a', email: 'a@crazer.app' },
      session: { access_token: 'token' } as unknown as Session,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  it('logout() vide les stores sorties, amis et carte', async () => {
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);
    fillUserData();

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expectUserDataCleared();
  });

  it("un SIGNED_OUT reçu de Supabase (session expirée, autre onglet) vide aussi les stores", async () => {
    let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
    (authService.getCurrentSession as jest.Mock).mockResolvedValue({ session: null, user: null });
    (authService.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return { unsubscribe: jest.fn() };
    });

    await act(async () => {
      await useAuthStore.getState().initializeAuth();
    });
    fillUserData();

    act(() => {
      listener?.('SIGNED_OUT', null);
    });

    expectUserDataCleared();
  });

  it("une requête lancée avant la déconnexion ne réinjecte pas les données de l'ancien compte", async () => {
    let resolveOutings: (rows: OutingRow[]) => void = () => undefined;
    let resolveFriends: (lists: {
      friends: UserSearchResult[];
      pendingRequests: UserSearchResult[];
    }) => void = () => undefined;
    const outingsSpy = jest
      .spyOn(outingService, 'fetchMyOutings')
      .mockReturnValue(new Promise((resolve) => (resolveOutings = resolve)));
    const friendsSpy = jest
      .spyOn(friendsService, 'getFriendsList')
      .mockReturnValue(new Promise((resolve) => (resolveFriends = resolve)));
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);

    // Pull-to-refresh en cours au moment où l'utilisateur A se déconnecte
    const pendingOutings = useOutingsStore.getState().fetchOutings();
    const pendingFriends = useFriendsStore.getState().fetchFriendsList('user-a');

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    await act(async () => {
      resolveOutings([outing]);
      resolveFriends({ friends: [friendOfA], pendingRequests: [] });
      await Promise.all([pendingOutings, pendingFriends]);
    });

    expect(useOutingsStore.getState().outings).toEqual([]);
    expect(useOutingsStore.getState().isLoading).toBe(false);
    expect(useFriendsStore.getState().friends).toEqual([]);
    expect(useFriendsStore.getState().isLoading).toBe(false);

    outingsSpy.mockRestore();
    friendsSpy.mockRestore();
  });

  it("ne vide rien si la déconnexion échoue", async () => {
    (authService.signOut as jest.Mock).mockRejectedValue(new Error('offline'));
    fillUserData();

    await act(async () => {
      await expect(useAuthStore.getState().logout()).rejects.toThrow('offline');
    });

    expect(useOutingsStore.getState().outings).toHaveLength(1);
  });
});
