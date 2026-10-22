import React from 'react';
import { PlaceDetailCard, PlaceDetailCardProps } from './PlaceDetailCard';
import { PlaceItem } from '../types/carte';

export type PoiDetailCardProps = {
  poi: PlaceItem;
  onClose: () => void;
  onAddToOuting?: (poi: PlaceItem) => void;
  onGetDirections?: (poi: PlaceItem) => void;
  expandAnim?: PlaceDetailCardProps['expandAnim'];
};

export const PoiDetailCard: React.FC<PoiDetailCardProps> = ({
  poi,
  onClose,
  onAddToOuting,
  onGetDirections,
  expandAnim,
}) => {
  return (
    <PlaceDetailCard
      place={poi}
      onClose={onClose}
      onAddToOuting={onAddToOuting}
      onGetDirections={onGetDirections}
      expandAnim={expandAnim}
    />
  );
};
