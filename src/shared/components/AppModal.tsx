import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { AppModalHeader } from './AppModalHeader';
import { SlideOverModal } from './SlideOverModal';
import { IconName } from './types';

export type AppModalVariant = 'center' | 'sheet' | 'fullScreen' | 'slideOver';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * `center` : boîte de dialogue ; `sheet` : panneau qui monte du bas ;
   * `fullScreen` : écran complet (safe area gérée), pour les parcours longs ;
   * `slideOver` : page complète qui arrive de la droite (détail d'une section, retour ←).
   */
  variant?: AppModalVariant;
  /** Fermer en touchant l'arrière-plan (par défaut : true, sans effet en `fullScreen`). */
  dismissOnBackdrop?: boolean;
  /** Boutons d'action affichés en bas (ex : Annuler / Confirmer). */
  footer?: React.ReactNode;
  /** Icône du bouton de fermeture (par défaut : `close`, `arrow-back` en `slideOver`). */
  closeIcon?: IconName;
  closeAccessibilityLabel?: string;
  /** testID du bouton de fermeture (par défaut : `${testID}-close`). */
  closeButtonTestID?: string;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onClose,
  title,
  children,
  variant = 'center',
  dismissOnBackdrop = true,
  footer,
  closeIcon,
  closeAccessibilityLabel,
  closeButtonTestID,
  contentStyle,
  testID = 'app-modal',
}) => {
  const insets = useSafeAreaInsets();
  const isSheet = variant === 'sheet';
  const isSlideOver = variant === 'slideOver';
  const isFullScreen = variant === 'fullScreen' || isSlideOver;

  const header = (
    <AppModalHeader
      title={title}
      isFullScreen={isFullScreen}
      onClose={onClose}
      closeIcon={closeIcon ?? (isSlideOver ? 'arrow-back' : 'close')}
      closeAccessibilityLabel={closeAccessibilityLabel ?? (isSlideOver ? 'Retour' : 'Fermer')}
      closeButtonTestID={closeButtonTestID ?? `${testID}-close`}
    />
  );

  const footerNode = footer ? <View style={styles.footer}>{footer}</View> : null;

  if (isSlideOver) {
    return (
      <SlideOverModal visible={visible} onClose={onClose} testID={testID}>
        {header}
        <View style={[styles.fullScreenBody, contentStyle]}>{children}</View>
        {footerNode}
      </SlideOverModal>
    );
  }

  if (isFullScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
        testID={testID}
      >
        <KeyboardAvoidingView
          style={[
            styles.fullScreen,
            { paddingBottom: Math.max(insets.bottom, spacing.md), paddingTop: insets.top },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {header}
          <View style={[styles.fullScreenBody, contentStyle]}>{children}</View>
          {footerNode}
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, isSheet ? styles.overlaySheet : styles.overlayCenter]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessible={dismissOnBackdrop}
          accessibilityRole="button"
          accessibilityLabel="Fermer la fenêtre"
          testID={`${testID}-backdrop`}
        />
        <View
          style={[
            styles.content,
            isSheet ? [styles.sheet, { paddingBottom: insets.bottom + spacing.lg }] : styles.dialog,
            contentStyle,
          ]}
          accessibilityViewIsModal
        >
          {isSheet ? <View style={styles.handle} /> : null}
          {header}
          {children}
          {footerNode}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  dialog: {
    borderRadius: radii.lg,
    maxWidth: 420,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  fullScreen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  fullScreenBody: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.full,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
  },
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlaySheet: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderBottomWidth: 0,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
  },
});
