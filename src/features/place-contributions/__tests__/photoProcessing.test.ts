import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { fitWithin, pickPhoto, preparePhoto } from '../services/photoProcessing';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const manipulate = ImageManipulator.manipulate as jest.Mock;

const granted = { granted: true } as Awaited<
  ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>
>;
const refused = { granted: false } as Awaited<
  ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>
>;

describe('fitWithin', () => {
  it('scales the longest side down and never up', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1080)).toEqual({ width: 1080 });
    expect(fitWithin({ width: 3000, height: 4000 }, 1080)).toEqual({ height: 1080 });
    expect(fitWithin({ width: 800, height: 600 }, 1080)).toBeNull();
  });
});

describe('pickPhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the library without EXIF and returns the image', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://a.jpg', width: 4000, height: 3000 }],
    } as ImagePicker.ImagePickerResult);

    await expect(pickPhoto('library')).resolves.toEqual({
      uri: 'file://a.jpg',
      width: 4000,
      height: 3000,
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false, mediaTypes: ['images'] }),
    );
  });

  it('returns null when the user cancels', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted);
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickPhoto('camera')).resolves.toBeNull();
  });

  it('fails with forbidden when the permission is refused', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(refused);
    await expect(pickPhoto('camera')).rejects.toMatchObject({ kind: 'forbidden' });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('preparePhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  const contextSaving = (result: { uri: string; width: number; height: number }) => {
    const saveAsync = jest.fn().mockResolvedValue(result);
    const context = {
      resize: jest.fn(),
      renderAsync: jest.fn().mockResolvedValue({ saveAsync }),
    };
    return { context, saveAsync };
  };

  it('builds a 1080 px photo then a 320 px thumbnail in JPEG', async () => {
    const full = contextSaving({ uri: 'file://full.jpg', width: 1080, height: 810 });
    const thumb = contextSaving({ uri: 'file://thumb.jpg', width: 320, height: 240 });
    manipulate.mockReturnValueOnce(full.context).mockReturnValueOnce(thumb.context);

    await expect(preparePhoto({ uri: 'file://a.jpg', width: 4000, height: 3000 })).resolves.toEqual(
      {
        full: { uri: 'file://full.jpg', width: 1080, height: 810 },
        thumbnail: { uri: 'file://thumb.jpg', width: 320, height: 240 },
      },
    );
    expect(full.context.resize).toHaveBeenCalledWith({ width: 1080 });
    expect(full.saveAsync).toHaveBeenCalledWith({ compress: 0.75, format: 'jpeg' });
    expect(manipulate).toHaveBeenLastCalledWith('file://full.jpg');
    expect(thumb.context.resize).toHaveBeenCalledWith({ width: 320 });
  });

  it('re-encodes a small photo without resizing it', async () => {
    const full = contextSaving({ uri: 'file://full.jpg', width: 300, height: 200 });
    const thumb = contextSaving({ uri: 'file://thumb.jpg', width: 300, height: 200 });
    manipulate.mockReturnValueOnce(full.context).mockReturnValueOnce(thumb.context);

    await preparePhoto({ uri: 'file://a.jpg', width: 300, height: 200 });

    expect(full.context.resize).not.toHaveBeenCalled();
    expect(full.saveAsync).toHaveBeenCalled();
  });

  it('turns a processing failure into an invalid contribution', async () => {
    manipulate.mockImplementation(() => {
      throw new Error('decode failed');
    });
    await expect(
      preparePhoto({ uri: 'file://a.jpg', width: 10, height: 10 }),
    ).rejects.toMatchObject({
      kind: 'invalid',
    });
  });
});
