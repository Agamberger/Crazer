import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityVotes, useOutingsStore } from '@/features/outings';

export default function OutingActivitiesRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const selectOuting = useOutingsStore((state) => state.selectOuting);

  const finish = () => {
    selectOuting(id);
    router.replace('/(tabs)/sorties');
  };

  const openTie = (day: string | null) =>
    router.push({
      pathname: '/outing/[id]/tie',
      params: day ? { id, day } : { id },
    });

  const convert = (title: string) =>
    router.push({ pathname: '/outing/create', params: { title } });

  return (
    <ActivityVotes
      outingId={id}
      onOpenTie={openTie}
      onConvert={(result) => convert(result.activity.title)}
      onClose={finish}
    />
  );
}
