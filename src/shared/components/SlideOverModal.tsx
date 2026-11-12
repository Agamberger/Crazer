import React from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/shared/constants/theme';
import { useSlideOverAnimation } from '@/shared/hooks/useSlideOverAnimation';

export interface SlideOverModalProps {
  visible: boolean;
  onClose: () => void;
  /** Title bar, body and footer, already laid out by `AppModal`. */
  children: React.ReactNode;
  testID?: string;
}

/**
 * Full-page modal that slides in from the right and slides back out to the right when it closes
 * (the content stays rendered until the exit animation ends). Used by `AppModal` (`slideOver`).
 */
export const SlideOverModal: React.FC<SlideOverModalProps> = ({
  visible,
  onClose,
  children,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const { isMounted, translateX } = useSlideOverAnimation(visible);

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <Animated.View
        style={[styles.page, { transform: [{ translateX }] }]}
        accessibilityViewIsModal
        testID={testID ? `${testID}-page` : undefined}
      >
        <KeyboardAvoidingView
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.md), paddingTop: insets.top },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  page: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
