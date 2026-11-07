import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '@/shared/constants/theme';
import { AppModal } from './AppModal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Bouton de confirmation rouge (suppression, départ d'un groupe…). */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/** Boîte de confirmation « Annuler / Confirmer » prête à l'emploi. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
}) => (
  <AppModal
    visible={visible}
    onClose={onCancel}
    title={title}
    dismissOnBackdrop={!loading}
    testID={testID}
    footer={
      <>
        <Button
          title={cancelLabel}
          variant="ghost"
          size="sm"
          onPress={onCancel}
          disabled={loading}
          testID={`${testID}-cancel`}
        />
        <Button
          title={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          size="sm"
          onPress={onConfirm}
          loading={loading}
          testID={`${testID}-confirm`}
        />
      </>
    }
  >
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </AppModal>
);

const styles = StyleSheet.create({
  message: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    lineHeight: 22,
  },
});
