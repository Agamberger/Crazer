import { supabase } from '@/shared/lib/supabase';
import { photoStoragePaths, uploadPlacePhoto } from '../services/photoUploadService';
import { placeContributionsService } from '../services/placeContributionsService';
import { ContributionError } from '../services/contributionError';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));
jest.mock('@/shared/utils/uuid', () => ({ createUuidV4: () => 'photo-uuid' }));

const storageFrom = supabase.storage.from as jest.Mock;
const prepared = {
  full: { uri: 'file://full.jpg', width: 1080, height: 720 },
  thumbnail: { uri: 'file://thumb.jpg', width: 320, height: 213 },
};

describe('photoUploadService', () => {
  const originalFetch = global.fetch;
  let upload: jest.Mock;
  let remove: jest.Mock;
  let register: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    upload = jest.fn().mockResolvedValue({ data: {}, error: null });
    remove = jest.fn().mockResolvedValue({ data: [], error: null });
    storageFrom.mockReturnValue({ upload, remove });
    register = jest.spyOn(placeContributionsService, 'registerPhoto');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    register.mockRestore();
  });

  it('builds the paths required by the bucket policies', () => {
    expect(photoStoragePaths('place', 'photo')).toEqual({
      full: 'place/photo.jpg',
      thumbnail: 'place/photo_thumb.jpg',
    });
  });

  it('uploads both JPEG files then registers the photo', async () => {
    const saved = {
      id: 'photo-uuid',
      placeId: 'p1',
      uploadedBy: 'alice',
      storagePath: 'p1/photo-uuid.jpg',
      thumbnailPath: 'p1/photo-uuid_thumb.jpg',
      width: 1080,
      height: 720,
      isHidden: false,
      createdAt: 't',
    };
    register.mockResolvedValue(saved);

    await expect(uploadPlacePhoto('p1', prepared)).resolves.toEqual(saved);

    expect(upload).toHaveBeenNthCalledWith(1, 'p1/photo-uuid.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: false,
    });
    expect(upload).toHaveBeenNthCalledWith(2, 'p1/photo-uuid_thumb.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: false,
    });
    expect(register).toHaveBeenCalledWith('p1', 'photo-uuid', 1080, 720);
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the uploaded files when the registration fails', async () => {
    register.mockRejectedValue(new ContributionError('quota_reached'));

    await expect(uploadPlacePhoto('p1', prepared)).rejects.toMatchObject({ kind: 'quota_reached' });
    expect(remove).toHaveBeenCalledWith(['p1/photo-uuid.jpg', 'p1/photo-uuid_thumb.jpg']);
  });

  it('reports a Storage policy refusal as a reached quota and cleans up', async () => {
    upload.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({
      data: null,
      error: { message: 'new row violates row-level security policy' },
    });

    await expect(uploadPlacePhoto('p1', prepared)).rejects.toMatchObject({ kind: 'quota_reached' });
    expect(remove).toHaveBeenCalledWith(['p1/photo-uuid.jpg']);
    expect(register).not.toHaveBeenCalled();
  });
});
