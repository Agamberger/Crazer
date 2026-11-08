import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PlannedOutingFormActions,
  PlannedOutingFormActionsProps,
} from '../components/PlannedOutingFormActions';

const renderActions = (props: Partial<PlannedOutingFormActionsProps> = {}) =>
  render(
    <PlannedOutingFormActions
      onCancel={jest.fn()}
      onSubmit={jest.fn()}
      isSaving={false}
      isDeleting={false}
      disabled={false}
      {...props}
    />,
  );

describe('PlannedOutingFormActions', () => {
  it('calls cancel and submit with the default testIDs', () => {
    const onCancel = jest.fn();
    const onSubmit = jest.fn();
    const { getByTestId, queryByTestId } = renderActions({ onCancel, onSubmit });

    fireEvent.press(getByTestId('btn-cancel-planned'));
    fireEvent.press(getByTestId('btn-submit-planned'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(queryByTestId('btn-delete-planned')).toBeNull();
  });

  it('shows the delete button only when deletion is possible', () => {
    const onRequestDelete = jest.fn();
    const { getByTestId } = renderActions({ onRequestDelete });

    fireEvent.press(getByTestId('btn-delete-planned'));
    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  it('uses the custom testIDs', () => {
    const { getByTestId } = renderActions({
      onRequestDelete: jest.fn(),
      submitTestID: 'save',
      cancelTestID: 'cancel',
      deleteTestID: 'delete',
    });

    expect(getByTestId('save')).toBeTruthy();
    expect(getByTestId('cancel')).toBeTruthy();
    expect(getByTestId('delete')).toBeTruthy();
  });

  it('disables every button while busy', () => {
    const onSubmit = jest.fn();
    const onRequestDelete = jest.fn();
    const { getByTestId } = renderActions({ onSubmit, onRequestDelete, disabled: true });

    fireEvent.press(getByTestId('btn-submit-planned'));
    fireEvent.press(getByTestId('btn-delete-planned'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onRequestDelete).not.toHaveBeenCalled();
  });
});
