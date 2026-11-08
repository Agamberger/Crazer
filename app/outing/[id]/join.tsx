import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { JoinOutingFlow } from '@/features/outings';

export default function JoinOutingRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <JoinOutingFlow
      outingId={id}
      onJoined={() => router.replace({ pathname: '/outing/[id]/recap', params: { id } })}
      onDeclined={() => router.back()}
      onClose={() => router.back()}
    />
  );
}
