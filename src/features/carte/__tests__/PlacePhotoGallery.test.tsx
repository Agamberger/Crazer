import React from 'react';
import { render } from '@testing-library/react-native';
import { PlacePhotoGallery } from '../components/PlacePhotoGallery';

describe('PlacePhotoGallery', () => {
  it('renders nothing without photos', () => {
    const { toJSON } = render(
      <PlacePhotoGallery photos={[]} placeTitle="Le Bar" isExpanded={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders one accessible image per photo', () => {
    const { getByTestId, getByLabelText } = render(
      <PlacePhotoGallery
        photos={['https://img/1.jpg', 'https://img/2.jpg']}
        placeTitle="Le Bar"
        isExpanded={false}
      />,
    );

    expect(getByTestId('place-photos-gallery')).toBeTruthy();
    expect(getByLabelText('Photo 1 de Le Bar').props.source).toEqual({ uri: 'https://img/1.jpg' });
    expect(getByLabelText('Photo 2 de Le Bar')).toBeTruthy();
  });
});
