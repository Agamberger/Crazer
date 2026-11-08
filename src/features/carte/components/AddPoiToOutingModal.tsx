import React from 'react';
import { AddPlaceToOutingModal } from './AddPlaceToOutingModal';
import { PlaceItem } from '../types/carte';
import { OutingRow, PlannedOutingRow } from '@/shared/types';

export interface AddPoiToOutingModalProps {
  visible: boolean;
  poi: PlaceItem | null;
  onClose: () => void;
  onSuccess?: (outing: OutingRow, plannedOuting: PlannedOutingRow) => void;
  onCreateNewOuting: (place: PlaceItem) => Promise<void> | void;
}

export const AddPoiToOutingModal: React.FC<AddPoiToOutingModalProps> = ({
  visible,
  poi,
  onClose,
  onSuccess,
  onCreateNewOuting,
}) => {
  return (
    <AddPlaceToOutingModal
      visible={visible}
      place={poi}
      onClose={onClose}
      onSuccess={onSuccess}
      onCreateNewOuting={onCreateNewOuting}
    />
  );
};
