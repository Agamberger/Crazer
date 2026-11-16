import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingPlanning } from '@/features/outings';

/** `/outing/[id]/planning`: planning of the day; closing it goes back to the outing hub. */
export default function OutingPlanningRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const finish = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/outing/[id]', params: { id } });
  };

  return <OutingPlanning outingId={id} onClose={finish} />;
}
