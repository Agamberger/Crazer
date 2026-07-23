import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFinancesStore } from '@/features/finances';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function FinancesScreen() {
  const depenses = useFinancesStore((state) => state.depenses);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Équilibrez les dépenses de vos sorties (Tricount)</Text>
      <FlatList
        data={depenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.amount}>{item.amount.toFixed(2)} €</Text>
            </View>
            <Text style={styles.details}>
              Payé par utilisateur {item.payerId} pour {item.beneficiaryIds.length} personnes
            </Text>
          </Card>
        )}
      />
      <Button title="+ Ajouter une dépense" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.success,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  card: {
    marginBottom: spacing.md,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spacing.md,
  },
  details: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
