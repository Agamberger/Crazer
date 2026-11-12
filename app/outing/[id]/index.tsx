import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingHub } from '@/features/outings';

/** `/outing/[id]`: hub of an outing (name, « Quand ? », « Qui ? », « Quoi ? »). */
export default function OutingHubRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sorties');
  };

  return (
    <OutingHub
      outingId={id}
      onClose={close}
      onOpenTie={(day) =>
        router.push({ pathname: '/outing/[id]/tie', params: day ? { id, day } : { id } })
      }
      onConvert={(title) => router.push({ pathname: '/outing/create', params: { title } })}
      onOpenPlanning={() => router.push({ pathname: '/outing/[id]/planning', params: { id } })}
    />
  );
}
