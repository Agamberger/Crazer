import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '@/shared/constants/theme';
import { IconButton } from './IconButton';
import { IconName } from './types';

export type AppModalVariant = 'center' | 'sheet' | 'fullScreen';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * `center` : boîte de dialogue ; `sheet` : panneau qui monte du bas ;
   * `fullScreen` : écran complet (safe area gérée), pour les parcours longs.
   */
  variant?: AppModalVariant;
  /** Fermer en touchant l'arrière-plan (par défaut : true, sans effet en `fullScreen`). */
  dismissOnBackdrop?: boolean;
  /** Boutons d'action affichés en bas (ex : Annuler / Confirmer). */
  footer?: React.ReactNode;
  /** Icône du bouton de fermeture (par défaut : `close`, ex : `arrow-back`). */
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
  closeIcon = 'close',
  closeAccessibilityLabel = 'Fermer',
  closeButtonTestID,
  contentStyle,
  testID = 'app-modal',
}) => {
  const insets = useSafeAreaInsets();
  const isSheet = variant === 'sheet';
  const isFullScreen = variant === 'fullScreen';

  const closeButton = (
    <IconButton
      icon={closeIcon}
      size="sm"
      variant={isFullScreen ? 'ghost' : 'surface'}
      accessibilityLabel={closeAccessibilityLabel}
      onPress={onClose}
      testID={closeButtonTestID ?? `${testID}-close`}
    />
  );

  // En plein écran le bouton de fermeture est toujours affiché (à gauche, comme une navigation).
  const header =
    isFullScreen || title ? (
      <View style={styles.header}>
        {isFullScreen ? closeButton : null}
        <Text
          style={[styles.title, isFullScreen && styles.titleFullScreen]}
          accessibilityRole="header"
          numberOfLines={2}
        >
          {title ?? ''}
        </Text>
        {isFullScreen ? <View style={styles.headerSpacer} /> : closeButton}
      </View>
    ) : null;

  const footerNode = footer ? <View style={styles.footer}>{footer}</View> : null;

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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  headerSpacer: {
    width: 32,
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
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.sm,
  },
  titleFullScreen: {
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
});
