import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ContributionError } from './contributionError';

/** Where the photo comes from. */
export type PhotoSource = 'library' | 'camera';

/** An image file on the device. */
export interface LocalImage {
  uri: string;
  width: number;
  height: number;
}

/** The two JPEG files uploaded for one photo (EXIF, GPS included, dropped by re-encoding). */
export interface PreparedPhoto {
  full: LocalImage;
  thumbnail: LocalImage;
}

/** Longest side of the uploaded photo (px). */
export const FULL_MAX_SIDE_PX = 1080;
/** Longest side of the thumbnail shown in lists (px). */
export const THUMBNAIL_MAX_SIDE_PX = 320;
const FULL_QUALITY = 0.75;
const THUMBNAIL_QUALITY = 0.6;

const requestPermission = async (source: PhotoSource): Promise<boolean> => {
  const response =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return response.granted;
};

/**
 * Lets the user take or pick one photo.
 *
 * @param source - camera or photo library
 * @returns the picked image, or `null` when the user cancels
 * @throws ContributionError `forbidden` when the permission is refused
 */
export async function pickPhoto(source: PhotoSource): Promise<LocalImage | null> {
  if (!(await requestPermission(source))) {
    throw new ContributionError('forbidden', `${source} permission refused`);
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
    allowsMultipleSelection: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Size of an image scaled down so that its longest side fits, never scaled up.
 *
 * @param image - original size
 * @param maxSide - maximum length of the longest side
 * @returns the resize to apply, or `null` when the image already fits
 */
export function fitWithin(
  image: Pick<LocalImage, 'width' | 'height'>,
  maxSide: number,
): { width: number } | { height: number } | null {
  if (Math.max(image.width, image.height) <= maxSide) return null;
  return image.width >= image.height ? { width: maxSide } : { height: maxSide };
}

const renderJpeg = async (
  image: LocalImage,
  maxSide: number,
  quality: number,
): Promise<LocalImage> => {
  const context = ImageManipulator.manipulate(image.uri);
  const resize = fitWithin(image, maxSide);
  if (resize) context.resize(resize);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
};

/**
 * Builds the files to upload: a 1080 px photo and a 320 px thumbnail, re-encoded in JPEG
 * (which drops the EXIF metadata, location included).
 *
 * @param image - picked image
 * @returns the full-size photo and its thumbnail
 * @throws ContributionError `invalid` when the image cannot be processed
 */
export async function preparePhoto(image: LocalImage): Promise<PreparedPhoto> {
  try {
    const full = await renderJpeg(image, FULL_MAX_SIDE_PX, FULL_QUALITY);
    const thumbnail = await renderJpeg(full, THUMBNAIL_MAX_SIDE_PX, THUMBNAIL_QUALITY);
    return { full, thumbnail };
  } catch (error: unknown) {
    throw new ContributionError(
      'invalid',
      error instanceof Error ? error.message : 'image processing failed',
    );
  }
}
