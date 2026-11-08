import React from 'react';
import { useRouter } from 'expo-router';
import { CreateOutingWizard } from '@/features/outings';

export default function CreateOutingRoute() {
  const router = useRouter();
  return (
    <CreateOutingWizard
      onCreated={(outingId) => router.replace({ pathname: '/outing/[id]/recap', params: { id: outingId } })}
      onClose={() => router.back()}
    />
  );
}
