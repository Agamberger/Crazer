import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AvailabilityRecap, useOutingsStore } from '@/features/outings';

export default function OutingRecapRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const selectOuting = useOutingsStore((state) => state.selectOuting);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sorties');
  };

  const openInSorties = () => {
    selectOuting(id);
    router.replace('/(tabs)/sorties');
  };

  const openQuestions = () => router.push({ pathname: '/outing/[id]/questions', params: { id } });

  return (
    <AvailabilityRecap
      outingId={id}
      onPlanned={openInSorties}
      onContinue={openQuestions}
      onAnswerQuestions={openQuestions}
      onClose={close}
    />
  );
}
