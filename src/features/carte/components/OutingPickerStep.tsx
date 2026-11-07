import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyState, InlineAlert, List } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingCard } from '@/features/outings/components/OutingCard';
import { OutingRow } from '@/shared/types';

export interface OutingPickerStepProps {
  /** Sorties proposées (déjà filtrées sur les sorties actives). */
  outings: OutingRow[];
  onSelectOuting: (outing: OutingRow) => void;
  onCreateOuting: () => void;
  isCreatingOuting: boolean;
  /** Erreur de création de sortie, affichée dans l'étape. */
  error?: string | null;
}

/** Étape 1 de l'ajout d'un lieu : choisir la sortie (ou en créer une). */
export const OutingPickerStep: React.FC<OutingPickerStepProps> = ({
  outings,
  onSelectOuting,
  onCreateOuting,
  isCreatingOuting,
  error,
}) => {
  const count = outings.length;
  const plural = count > 1 ? 's' : '';

  return (
    <View style={styles.container} testID="step-select-outing">
      <View style={styles.header}>
        <AppText weight="bold">Vos sorties actives</AppText>
        <AppText variant="caption" color="muted">
          {`${count} sortie${plural} disponible${plural}`}
        </AppText>
      </View>

      {error ? <InlineAlert message={error} testID="error-create-outing" /> : null}

      {count === 0 ? (
        <View testID="empty-outings-state">
          <EmptyState
            icon="sparkles-outline"
            title="Aucune sortie active"
            description="Vous n'avez pas de sortie en cours ou planifiée. Créez-en une nouvelle pour y ajouter ce lieu !"
          />
          <Button
            title="+ Créer une nouvelle sortie"
            onPress={onCreateOuting}
            loading={isCreatingOuting}
            testID="btn-create-outing-empty"
          />
        </View>
      ) : (
        <List
          data={outings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          testID="active-outings-list"
          renderItem={({ item }) => (
            <OutingCard
              outing={item}
              onPress={() => onSelectOuting(item)}
              testID={`btn-select-outing-${item.id}`}
            />
          )}
          ListFooterComponent={
            <Button
              title="+ Créer une nouvelle sortie"
              variant="outline"
              onPress={onCreateOuting}
              loading={isCreatingOuting}
              testID="btn-create-new-outing"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
