import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, IconButton } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface WizardHeaderProps {
  title: string;
  /** Zero-based index of the current step. */
  stepIndex: number;
  stepCount: number;
  /** Back on the previous step, or close on the first one. */
  onBack: () => void;
  onClose: () => void;
}

/** Header of a flow: back / close, title and « Étape x/n » (hidden for a single step). */
export const WizardHeader: React.FC<WizardHeaderProps> = ({
  title,
  stepIndex,
  stepCount,
  onBack,
  onClose,
}) => {
  const isFirst = stepIndex === 0;
  return (
    <View style={styles.container}>
      <IconButton
        icon={isFirst ? 'close' : 'arrow-back'}
        accessibilityLabel={isFirst ? 'Fermer' : 'Étape précédente'}
        variant="ghost"
        onPress={isFirst ? onClose : onBack}
        testID="btn-wizard-back"
      />
      <View style={styles.titles}>
        <AppText variant="h3">{title}</AppText>
        {stepCount > 1 ? (
          <AppText variant="caption" color="secondary" testID="wizard-progress">
            Étape {stepIndex + 1}/{stepCount}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  titles: {
    flex: 1,
  },
});
