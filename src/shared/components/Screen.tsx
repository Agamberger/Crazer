import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/shared/constants/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** Contenu défilable (ScrollView). Ne pas activer si l'écran contient une `List`. */
  scrollable?: boolean;
  /** Applique un padding horizontal standard (par défaut : true). */
  padded?: boolean;
  /** Bords protégés par la safe area (par défaut : haut + bas). */
  edges?: Edge[];
  /** Décale le contenu au-dessus du clavier (formulaires). */
  avoidKeyboard?: boolean;
  /** Élément fixe en haut (header personnalisé). */
  header?: React.ReactNode;
  /** Élément fixe en bas (bouton d'action principal). */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Conteneur racine d'écran : fond thémé, safe area, clavier, scroll. */
export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  padded = true,
  edges = ['top', 'bottom'],
  avoidKeyboard = false,
  header,
  footer,
  contentStyle,
  testID = 'screen',
}) => {
  const padding = padded ? styles.padded : null;

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.container} edges={edges} testID={testID}>
      {header}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
      {footer ? <View style={[styles.footer, padding]}>{footer}</View> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  padded: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
});
