import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PlacePhotosSection } from '../components/PlacePhotosSection';
import * as processing from '../services/photoProcessing';
import * as upload from '../services/photoUploadService';
import { placeContributionsService } from '../services/placeContributionsService';
import { ContributionError } from '../services/contributionError';
import { PlacePhoto } from '../types/contributions';

jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }));
jest.mock('../services/photoProcessing', () => ({ pickPhoto: jest.fn(), preparePhoto: jest.fn() }));
jest.mock('../services/photoUploadService', () => ({ uploadPlacePhoto: jest.fn() }));
jest.mock('../services/placeContributionsService', () => ({
  placeContributionsService: {
    fetchPhotos: jest.fn(),
    createPhotoUrls: jest.fn(),
    fetchUploaderNames: jest.fn(),
    reportPhoto: jest.fn(),
    deletePhoto: jest.fn(),
  },
}));

const service = placeContributionsService as jest.Mocked<typeof placeContributionsService>;
const pickPhoto = processing.pickPhoto as jest.Mock;
const preparePhoto = processing.preparePhoto as jest.Mock;
const uploadPlacePhoto = upload.uploadPlacePhoto as jest.Mock;

const photoOf = (id: string, uploadedBy: string): PlacePhoto => ({
  id,
  placeId: 'p1',
  uploadedBy,
  storagePath: `p1/${id}.jpg`,
  thumbnailPath: `p1/${id}_thumb.jpg`,
  width: 1080,
  height: 720,
  isHidden: false,
  createdAt: 't',
});

const urlsFor = async (paths: readonly string[]) =>
  Object.fromEntries(paths.map((path) => [path, `https://signed/${path}`]));

describe('PlacePhotosSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.createPhotoUrls.mockImplementation(urlsFor);
    service.fetchUploaderNames.mockResolvedValue({ bob: 'Bob Martin' });
  });

  it('lists the community photos of a saved place', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'bob')]);

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);

    expect(await screen.findByTestId('place-photo-ph1')).toBeTruthy();
    expect(service.fetchPhotos).toHaveBeenCalledWith('p1');
  });

  it('credits each photo to its uploader, like the Google photos', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'bob'), photoOf('ph2', 'nameless')]);

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);

    expect(await screen.findByText('© Bob Martin')).toBeTruthy();
    expect(screen.getByTestId('place-photo-ph2-credit').props.children).toEqual([
      '© ',
      'Membre Crazer',
    ]);
    expect(service.fetchUploaderNames).toHaveBeenCalledWith(['bob', 'nameless']);

    fireEvent.press(screen.getByTestId('place-photo-ph1'));
    expect(screen.getByTestId('place-photo-viewer-credit')).toBeTruthy();
  });

  it('still shows the photos when the uploader names cannot be loaded', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'bob')]);
    service.fetchUploaderNames.mockRejectedValue(new Error('network'));

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);

    expect(await screen.findByText('© Membre Crazer')).toBeTruthy();
  });

  it('shows the add tile and the other source photos for an unsaved place, without loading anything', () => {
    render(
      <PlacePhotosSection
        placeId={null}
        resolvePlaceId={jest.fn()}
        placeTitle="Tour Eiffel"
        otherPhotos={[{ url: 'https://google/1', credit: 'Jo' }, { url: 'https://google/2' }]}
      />,
    );

    expect(screen.getByTestId('place-photos-add')).toBeTruthy();
    expect(screen.getByTestId('place-other-photo-0')).toBeTruthy();
    expect(screen.getByText('© Jo')).toBeTruthy();
    expect(screen.queryByTestId('place-other-photo-1-credit')).toBeNull();
    expect(service.fetchPhotos).not.toHaveBeenCalled();
  });

  it('puts community photos before the other source photos in one strip', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'bob')]);

    render(
      <PlacePhotosSection
        placeId="p1"
        resolvePlaceId={jest.fn()}
        placeTitle="Bowling"
        otherPhotos={[{ url: 'https://google/1', credit: 'Jo' }]}
      />,
    );

    await screen.findByTestId('place-photo-ph1');
    expect(screen.getAllByText(/^© /).map((node) => node.props.children.join(''))).toEqual([
      '© Bob Martin',
      '© Jo',
    ]);
  });

  it('saves the place first, uploads the photo and shows it', async () => {
    const resolvePlaceId = jest.fn().mockResolvedValue('new-place');
    pickPhoto.mockResolvedValue({ uri: 'file://a.jpg', width: 4000, height: 3000 });
    preparePhoto.mockResolvedValue({ full: {}, thumbnail: {} });
    uploadPlacePhoto.mockResolvedValue({ ...photoOf('ph2', 'alice'), placeId: 'new-place' });
    service.fetchPhotos.mockResolvedValue([{ ...photoOf('ph2', 'alice'), placeId: 'new-place' }]);

    render(
      <PlacePhotosSection
        placeId={null}
        resolvePlaceId={resolvePlaceId}
        placeTitle="Tour Eiffel"
      />,
    );
    fireEvent.press(screen.getByTestId('place-photos-add'));
    fireEvent.press(screen.getByTestId('place-photos-library'));

    expect(await screen.findByTestId('place-photo-ph2')).toBeTruthy();
    expect(pickPhoto).toHaveBeenCalledWith('library');
    expect(resolvePlaceId).toHaveBeenCalled();
    expect(uploadPlacePhoto).toHaveBeenCalledWith('new-place', { full: {}, thumbnail: {} });
  });

  it('shows the French message of a failed upload', async () => {
    service.fetchPhotos.mockResolvedValue([]);
    pickPhoto.mockResolvedValue({ uri: 'file://a.jpg', width: 10, height: 10 });
    preparePhoto.mockResolvedValue({ full: {}, thumbnail: {} });
    uploadPlacePhoto.mockRejectedValue(new ContributionError('quota_reached'));

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);
    fireEvent.press(screen.getByTestId('place-photos-add'));
    fireEvent.press(screen.getByTestId('place-photos-library'));

    expect(await screen.findByText(/Limite atteinte/)).toBeTruthy();
  });

  it('does nothing when the user cancels the picker', async () => {
    service.fetchPhotos.mockResolvedValue([]);
    pickPhoto.mockResolvedValue(null);

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);
    fireEvent.press(screen.getByTestId('place-photos-add'));
    fireEvent.press(screen.getByTestId('place-photos-library'));

    await waitFor(() => expect(pickPhoto).toHaveBeenCalled());
    expect(preparePhoto).not.toHaveBeenCalled();
    expect(screen.queryByTestId('place-photos-error')).toBeNull();
  });

  it('reports someone else’s photo with a reason and hides it at the third report', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'bob')]);
    service.reportPhoto.mockResolvedValue(true);

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);
    fireEvent.press(await screen.findByTestId('place-photo-ph1'));
    fireEvent.press(screen.getByTestId('place-photo-report-reason-spam'));
    fireEvent.press(screen.getByTestId('place-photo-report'));

    await waitFor(() => expect(service.reportPhoto).toHaveBeenCalledWith('ph1', 'spam'));
    await waitFor(() => expect(screen.queryByTestId('place-photo-ph1')).toBeNull());
  });

  it('lets the uploader delete their own photo', async () => {
    service.fetchPhotos.mockResolvedValue([photoOf('ph1', 'alice')]);
    service.deletePhoto.mockResolvedValue(undefined);

    render(<PlacePhotosSection placeId="p1" resolvePlaceId={jest.fn()} placeTitle="Bowling" />);
    fireEvent.press(await screen.findByTestId('place-photo-ph1'));
    expect(screen.queryByTestId('place-photo-report')).toBeNull();
    fireEvent.press(screen.getByTestId('place-photo-delete'));

    await waitFor(() => expect(service.deletePhoto).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('place-photo-ph1')).toBeNull());
  });
});
