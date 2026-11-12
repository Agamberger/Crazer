import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OutingHub } from '@/features/outings';

/** `/outing/[id]`: hub of an outing (name, « Quand ? », « Qui ? », « Comment ? »). */
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
      onOpenWhen={() => router.push({ pathname: '/outing/[id]/recap', params: { id } })}
      onOpenHow={() => router.push({ pathname: '/outing/[id]/questions', params: { id } })}
    />
  );
}
