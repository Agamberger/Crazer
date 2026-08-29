import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Expense } from '../types';
import { CategoryFilterChips, CategoryFilterValue } from './CategoryFilterChips';
import { ExpenseItem } from './ExpenseItem';

export interface ExpenseListProps {
  expenses: Expense[];
  currentUserId?: string;
  participantNames?: Record<string, string>;
  onPressExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAddExpense?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  currentUserId,
  participantNames = {},
  onPressExpense,
  onDeleteExpense,
  onAddExpense,
  refreshing = false,
  onRefresh,
  testID = 'expense-list-container',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterValue>('all');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // 1. Filtre par catégorie
      if (selectedCategory !== 'all' && expense.category !== selectedCategory) {
        return false;
      }

      // 2. Filtre par recherche textuelle (titre ou payeur)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatches = expense.title.toLowerCase().includes(query);
        const payerName = (participantNames[expense.payerId] || '').toLowerCase();
        const payerMatches = payerName.includes(query);
        return titleMatches || payerMatches;
      }

      return true;
    });
  }, [expenses, selectedCategory, searchQuery, participantNames]);

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer} testID="empty-expenses-view">
      <View style={styles.emptyIconCircle}>
        <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery || selectedCategory !== 'all'
          ? 'Aucun résultat trouvé'
          : 'Aucune dépense enregistrée'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory !== 'all'
          ? 'Essayez de modifier votre recherche ou filtre de catégorie.'
          : 'Ajoutez la première dépense de votre sortie pour commencer le suivi partagé.'}
      </Text>
      {onAddExpense && !searchQuery && selectedCategory === 'all' ? (
        <Button
          title="+ Ajouter une dépense"
          variant="primary"
          onPress={onAddExpense}
          style={styles.emptyButton}
          testID="btn-add-expense-empty"
        />
      ) : null}
    </View>
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une dépense ou un payeur..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          testID="input-expense-search"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="btn-clear-search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtres de catégories */}
      <CategoryFilterChips
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        style={styles.chipsBar}
      />

      {/* Liste des dépenses */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseItem
            expense={item}
            currentUserId={currentUserId}
            participantNames={participantNames}
            onPress={onPressExpense}
            onDelete={onDeleteExpense}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        testID="expenses-flatlist"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chipsBar: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  container: {
    flex: 1,
  },
  emptyButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 72,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.sm,
    padding: 0,
  },
});
