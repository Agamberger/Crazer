import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingPlanning, useOutingsStore } from '@/features/outings';

export default function OutingPlanningRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const selectOuting = useOutingsStore((state) => state.selectOuting);

  const finish = () => {
    selectOuting(id);
    router.replace('/(tabs)/sorties');
  };

  return <OutingPlanning outingId={id} onClose={finish} />;
}
