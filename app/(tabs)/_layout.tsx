import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/shared/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sorties',
          headerTitle: 'Mes Sorties',
        }}
      />
      <Tabs.Screen
        name="activites"
        options={{
          title: 'Activités',
          headerTitle: 'Découvrir',
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Finances',
          headerTitle: 'Dépenses du groupe',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          headerTitle: 'Journal d\'aventure',
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Profil',
        }}
      />
    </Tabs>
  );
}
