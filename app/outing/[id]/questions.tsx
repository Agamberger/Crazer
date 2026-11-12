import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingQuestions } from '@/features/outings';

export default function OutingQuestionsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sorties');
  };

  const openActivities = () => router.replace({ pathname: '/outing/[id]/activities', params: { id } });

  return <OutingQuestions outingId={id} onDone={openActivities} onClose={close} />;
}
