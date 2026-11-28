import { supabase } from '@/shared/lib/supabase';
import { ContributionError, toContributionError } from '../services/contributionError';
import {
  PLACE_PHOTOS_BUCKET,
  placeContributionsService as service,
} from '../services/placeContributionsService';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), storage: { from: jest.fn() } },
}));

const from = supabase.from as jest.Mock;
const rpc = supabase.rpc as jest.Mock;
const storageFrom = supabase.storage.from as jest.Mock;

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'in',
  'order',
  'single',
  'maybeSingle',
] as const;

type Chain = PromiseLike<QueryResult> & Record<(typeof CHAIN_METHODS)[number], jest.Mock>;

const builder = (result: QueryResult): Chain => {
  const thenable: PromiseLike<QueryResult> = {
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const chain = thenable as Chain;
  CHAIN_METHODS.forEach((name) => {
    chain[name] = jest.fn().mockReturnValue(chain);
  });
  return chain;
};

const PHOTO_ROW = {
  id: 'ph1',
  place_id: 'p1',
  uploaded_by: 'alice',
  storage_path: 'p1/ph1.jpg',
  thumbnail_path: 'p1/ph1_thumb.jpg',
  width: 1080,
  height: 720,
  report_count: 0,
  is_hidden: false,
  created_at: 't',
};

const PROPOSAL_ROW = {
  id: 'h1',
  place_id: 'p1',
  proposed_by: 'alice',
  periods: [{ day: 0, open: '10:00', close: '18:00' }],
  status: 'pending',
  yes_count: 0,
  no_count: 0,
  created_at: 't',
  updated_at: 't2',
};

describe('toContributionError', () => {
  it.each([
    ['54000', 'quota_reached'],
    ['P0002', 'not_found'],
    ['22023', 'invalid'],
    ['42501', 'forbidden'],
    [undefined, 'network'],
  ])('maps code %s to %s', (code, kind) => {
    const error = toContributionError({ message: 'x', code });
    expect(error).toBeInstanceOf(ContributionError);
    expect(error.kind).toBe(kind);
    expect(error.userMessage.length).toBeGreaterThan(0);
  });
});

describe('placeContributionsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetchSummaries deduplicates the ids and converts the rows', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          place_id: 'p1',
          photo_count: 3,
          review_count: 2,
          average_rating: '4.50',
          confirmed_hours: [{ day: 1, open: '09:00', close: '17:00' }],
        },
        {
          place_id: 'p2',
          photo_count: 0,
          review_count: 0,
          average_rating: null,
          confirmed_hours: null,
        },
      ],
      error: null,
    });

    await expect(service.fetchSummaries(['p1', 'p1', 'p2'])).resolves.toEqual([
      {
        placeId: 'p1',
        photoCount: 3,
        reviewCount: 2,
        averageRating: 4.5,
        confirmedHours: [{ day: 1, open: '09:00', close: '17:00' }],
      },
      { placeId: 'p2', photoCount: 0, reviewCount: 0, averageRating: null, confirmedHours: null },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_place_contribution_summaries', {
      p_place_ids: ['p1', 'p2'],
    });
  });

  it('fetchSummaries sends nothing without ids', async () => {
    await expect(service.fetchSummaries([])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fetchPhotos converts the rows and raises typed errors', async () => {
    from.mockReturnValueOnce(builder({ data: [PHOTO_ROW], error: null }));
    await expect(service.fetchPhotos('p1')).resolves.toEqual([
      {
        id: 'ph1',
        placeId: 'p1',
        uploadedBy: 'alice',
        storagePath: 'p1/ph1.jpg',
        thumbnailPath: 'p1/ph1_thumb.jpg',
        width: 1080,
        height: 720,
        isHidden: false,
        createdAt: 't',
      },
    ]);

    from.mockReturnValueOnce(builder({ data: null, error: { message: 'boom' } }));
    await expect(service.fetchPhotos('p1')).rejects.toMatchObject({ kind: 'network' });
  });

  it('createPhotoUrls signs the paths in the private bucket and skips failures', async () => {
    const createSignedUrls = jest.fn().mockResolvedValue({
      data: [
        { path: 'p1/ph1_thumb.jpg', signedUrl: 'https://signed/1', error: null },
        { path: 'p1/gone.jpg', signedUrl: '', error: 'Not found' },
      ],
      error: null,
    });
    storageFrom.mockReturnValue({ createSignedUrls });

    await expect(service.createPhotoUrls(['p1/ph1_thumb.jpg', 'p1/gone.jpg'])).resolves.toEqual({
      'p1/ph1_thumb.jpg': 'https://signed/1',
    });
    expect(storageFrom).toHaveBeenCalledWith(PLACE_PHOTOS_BUCKET);
    expect(createSignedUrls).toHaveBeenCalledWith(['p1/ph1_thumb.jpg', 'p1/gone.jpg'], 3600);
  });

  it('fetchUploaderNames reads the profile names and skips empty ones', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: 'bob', full_name: ' Bob Martin ', avatar_url: null, email: null },
        { id: 'eve', full_name: null, avatar_url: null, email: null },
      ],
      error: null,
    });

    await expect(service.fetchUploaderNames(['bob', 'bob', 'eve'])).resolves.toEqual({
      bob: 'Bob Martin',
    });
    expect(rpc).toHaveBeenCalledWith('get_profiles', { p_ids: ['bob', 'eve'] });
    await expect(service.fetchUploaderNames([])).resolves.toEqual({});
  });

  it('registerPhoto maps the quota error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'daily photo quota reached', code: '54000' },
    });
    await expect(service.registerPhoto('p1', 'ph1', 1080, 720)).rejects.toMatchObject({
      kind: 'quota_reached',
    });
    expect(rpc).toHaveBeenCalledWith('add_place_photo', {
      p_place_id: 'p1',
      p_photo_id: 'ph1',
      p_width: 1080,
      p_height: 720,
    });
  });

  it('reportPhoto returns whether the photo is now hidden', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(service.reportPhoto('ph1', 'spam')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('report_place_photo', { p_photo_id: 'ph1', p_reason: 'spam' });
  });

  it('deletePhoto deletes the row then both files', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const remove = jest.fn().mockResolvedValue({ data: [], error: null });
    storageFrom.mockReturnValue({ remove });

    await service.deletePhoto({
      id: 'ph1',
      placeId: 'p1',
      uploadedBy: 'alice',
      storagePath: 'p1/ph1.jpg',
      thumbnailPath: 'p1/ph1_thumb.jpg',
      width: 1,
      height: 1,
      isHidden: false,
      createdAt: 't',
    });

    expect(rpc).toHaveBeenCalledWith('delete_place_photo', { p_photo_id: 'ph1' });
    expect(remove).toHaveBeenCalledWith(['p1/ph1.jpg', 'p1/ph1_thumb.jpg']);
  });

  it('fetchHoursProposals keeps pending proposals and only the latest confirmed one', async () => {
    from.mockReturnValue(
      builder({
        data: [
          { ...PROPOSAL_ROW, id: 'c-new', status: 'confirmed' },
          { ...PROPOSAL_ROW, id: 'pending' },
          { ...PROPOSAL_ROW, id: 'c-old', status: 'confirmed' },
        ],
        error: null,
      }),
    );

    const proposals = await service.fetchHoursProposals('p1');

    expect(proposals.map((proposal) => proposal.id)).toEqual(['c-new', 'pending']);
    expect(proposals[0].periods).toEqual([{ day: 0, open: '10:00', close: '18:00' }]);
  });

  it('fetchMyHoursVotes returns the vote per proposal', async () => {
    from.mockReturnValue(
      builder({ data: [{ proposal_id: 'h1', is_correct: false }], error: null }),
    );
    await expect(service.fetchMyHoursVotes(['h1'])).resolves.toEqual({ h1: false });
    await expect(service.fetchMyHoursVotes([])).resolves.toEqual({});
  });

  it('proposeHours refuses invalid periods before sending', async () => {
    await expect(
      service.proposeHours('p1', [{ day: 0, open: '25:00', close: '18:00' }]),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('proposeHours and voteHours call their RPCs', async () => {
    rpc.mockResolvedValue({ data: PROPOSAL_ROW, error: null });

    await service.proposeHours('p1', [{ day: 0, open: '10:00', close: '18:00' }]);
    expect(rpc).toHaveBeenLastCalledWith('propose_place_hours', {
      p_place_id: 'p1',
      p_periods: [{ day: 0, open: '10:00', close: '18:00' }],
    });

    rpc.mockResolvedValue({
      data: { ...PROPOSAL_ROW, status: 'confirmed', yes_count: 2 },
      error: null,
    });
    await expect(service.voteHours('h1', true)).resolves.toMatchObject({
      status: 'confirmed',
      yesCount: 2,
    });
    expect(rpc).toHaveBeenLastCalledWith('vote_place_hours', {
      p_proposal_id: 'h1',
      p_is_correct: true,
    });
  });

  it('saveMyReview inserts a new review with a trimmed comment', async () => {
    const read = builder({ data: null, error: null });
    const write = builder({
      data: {
        id: 'r1',
        place_id: 'p1',
        author_id: 'alice',
        rating: 4,
        comment: 'Top',
        updated_at: 't',
      },
      error: null,
    });
    from.mockReturnValueOnce(read).mockReturnValueOnce(write);

    await expect(
      service.saveMyReview({ placeId: 'p1', rating: 4, comment: '  Top  ' }, 'alice'),
    ).resolves.toEqual({
      id: 'r1',
      placeId: 'p1',
      authorId: 'alice',
      rating: 4,
      comment: 'Top',
      updatedAt: 't',
    });
    expect(write.insert).toHaveBeenCalledWith({
      place_id: 'p1',
      author_id: 'alice',
      rating: 4,
      comment: 'Top',
    });
  });

  it('saveMyReview updates the existing review', async () => {
    const read = builder({ data: { id: 'r1' }, error: null });
    const write = builder({
      data: {
        id: 'r1',
        place_id: 'p1',
        author_id: 'alice',
        rating: 2,
        comment: null,
        updated_at: 't',
      },
      error: null,
    });
    from.mockReturnValueOnce(read).mockReturnValueOnce(write);

    await service.saveMyReview({ placeId: 'p1', rating: 2, comment: '   ' }, 'alice');
    expect(write.update).toHaveBeenCalledWith({ rating: 2, comment: null });
    expect(write.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('saveMyReview refuses a bad rating or a too long comment', async () => {
    await expect(
      service.saveMyReview({ placeId: 'p1', rating: 6, comment: null }, 'alice'),
    ).rejects.toMatchObject({ kind: 'invalid' });
    await expect(
      service.saveMyReview({ placeId: 'p1', rating: 3, comment: 'x'.repeat(501) }, 'alice'),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('fetchReviews and deleteMyReview use the reviews table', async () => {
    const list = builder({
      data: [
        { id: 'r1', place_id: 'p1', author_id: 'bob', rating: 5, comment: null, updated_at: 't' },
      ],
      error: null,
    });
    from.mockReturnValueOnce(list);
    await expect(service.fetchReviews('p1')).resolves.toHaveLength(1);

    const remove = builder({ data: null, error: null });
    from.mockReturnValueOnce(remove);
    await service.deleteMyReview('p1', 'alice');
    expect(remove.delete).toHaveBeenCalled();
    expect(remove.eq).toHaveBeenCalledWith('author_id', 'alice');
  });
});
