import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingQuestions, useOutingsStore } from '@/features/outings';

export default function OutingQuestionsRoute() {
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

  return <OutingQuestions outingId={id} onDone={openInSorties} onClose={close} />;
}
