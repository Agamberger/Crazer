import React from 'react';
import { FlatList, FlatListProps, RefreshControl, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/shared/constants/theme';
import { EmptyState, EmptyStateProps } from './EmptyState';
import { InlineAlert } from './InlineAlert';
import { Loader } from './Loader';

export interface ListProps<T> extends Omit<
  FlatListProps<T>,
  'ListEmptyComponent' | 'refreshControl'
> {
  /** Premier chargement : affiche un loader à la place de la liste. */
  loading?: boolean;
  /** Pull-to-refresh en cours. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Message d'erreur affiché au-dessus de la liste. */
  error?: string | null;
  /** Props de l'état vide (au minimum `title`). */
  empty?: EmptyStateProps;
  /** Ajoute un espace entre les éléments. */
  gap?: keyof typeof spacing;
}

type SpacingKey = keyof typeof spacing;

// Séparateurs définis une seule fois : une fonction inline serait un nouveau
// composant à chaque rendu et forcerait le remontage de tous les séparateurs.
const SEPARATORS = Object.fromEntries(
  (Object.keys(spacing) as SpacingKey[]).map((key) => {
    const Separator: React.FC = () => <View style={{ height: spacing[key] }} />;
    Separator.displayName = `ListSeparator(${key})`;
    return [key, Separator];
  }),
) as Record<SpacingKey, React.FC>;

const renderHeader =(header: FlatListProps<unknown>['ListHeaderComponent']): React.ReactNode => {
  if (!header) return null;
  if (React.isValidElement(header)) return header;
  const HeaderComponent = header as React.ComponentType;
  return <HeaderComponent />;
};

/**
 * FlatList thémée avec gestion intégrée du chargement, de l'erreur,
 * de l'état vide et du pull-to-refresh.
 */
export function List<T>({
  loading = false,
  refreshing = false,
  onRefresh,
  error,
  empty,
  gap,
  ListHeaderComponent,
  contentContainerStyle,
  data,
  ...props
}: ListProps<T>) {
  if (loading && (!data || data.length === 0)) {
    return <Loader testID="list-loader" />;
  }

  const header = (
    <>
      {error ? <InlineAlert message={error} tone="error" testID="list-error" /> : null}
      {renderHeader(ListHeaderComponent)}
    </>
  );

  return (
    <FlatList
      data={data}
      ListHeaderComponent={header}
      ListEmptyComponent={empty ? <EmptyState {...empty} /> : undefined}
      ItemSeparatorComponent={gap ? SEPARATORS[gap] : undefined}
      contentContainerStyle={[
        (!data || data.length === 0) && styles.emptyContainer,
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flexGrow: 1,
  },
});
