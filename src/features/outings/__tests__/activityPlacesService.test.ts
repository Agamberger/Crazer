import {
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
} from '@/features/carte/services/googlePlacesService';
import { ensurePlaceExists, searchPlaces } from '@/features/carte/services/placeService';
import { activityPlacesService } from '../services/activityPlacesService';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/carte/services/placeService', () => ({
  searchPlaces: jest.fn(),
  ensurePlaceExists: jest.fn(),
}));
jest.mock('@/features/carte/services/googlePlacesService', () => ({
  fetchGooglePlaceAutocomplete: jest.fn(),
  fetchGooglePlaceDetails: jest.fn(),
  googlePlaceDetailsToPlaceItem: jest.fn((details: { name: string }) => ({ title: details.name })),
}));

const search = searchPlaces as jest.Mock;
const autocomplete = fetchGooglePlaceAutocomplete as jest.Mock;
const details = fetchGooglePlaceDetails as jest.Mock;
const ensure = ensurePlaceExists as jest.Mock;

describe('activityPlacesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('réunit les lieux Crazer puis ceux de Google Maps', async () => {
    search.mockResolvedValue([{ id: 'p1', name: 'Burger Gourmet', address: '1 rue X', city: 'Paris' }]);
    autocomplete.mockResolvedValue([
      {
        place_id: 'g1',
        description: 'Bowling Paris',
        structured_formatting: { main_text: 'Bowling', secondary_text: 'Paris' },
      },
    ]);
    await expect(activityPlacesService.searchSuggestions('bo', 'token')).resolves.toEqual([
      { key: 'p1', source: 'crazer', name: 'Burger Gourmet', subtitle: '1 rue X' },
      { key: 'g1', source: 'google', name: 'Bowling', subtitle: 'Paris' },
    ]);
    expect(autocomplete).toHaveBeenCalledWith('bo', 'token');
  });

  it('garde les résultats d’une source quand l’autre échoue', async () => {
    search.mockRejectedValue(new Error('boom'));
    autocomplete.mockResolvedValue([{ place_id: 'g1', description: 'Bowling Paris' }]);
    const found = await activityPlacesService.searchSuggestions('bo');
    expect(found).toEqual([{ key: 'g1', source: 'google', name: 'Bowling Paris', subtitle: null }]);
  });

  it('un lieu Crazer est déjà stocké : aucun import', async () => {
    const place = await activityPlacesService.resolveSuggestion(
      { key: 'p1', source: 'crazer', name: 'Burger', subtitle: null },
      'alice',
    );
    expect(place).toEqual({ id: 'p1', name: 'Burger' });
    expect(ensure).not.toHaveBeenCalled();
  });

  it('un lieu Google est importé dans places avant d’être lié', async () => {
    details.mockResolvedValue({ name: 'Bowling' });
    ensure.mockResolvedValue('new-uuid');
    const place = await activityPlacesService.resolveSuggestion(
      { key: 'g1', source: 'google', name: 'Bowling', subtitle: null },
      'alice',
      'token',
    );
    expect(details).toHaveBeenCalledWith('g1', 'token');
    expect(ensure).toHaveBeenCalledWith({ title: 'Bowling' }, 'alice');
    expect(place).toEqual({ id: 'new-uuid', name: 'Bowling' });
  });

  it('échoue quand Google ne renvoie pas le détail du lieu', async () => {
    details.mockResolvedValue(null);
    await expect(
      activityPlacesService.resolveSuggestion(
        { key: 'g1', source: 'google', name: 'Bowling', subtitle: null },
        'alice',
      ),
    ).rejects.toThrow('Lieu Google introuvable');
  });
});
