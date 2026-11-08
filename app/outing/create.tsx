import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CreateOutingWizard } from '@/features/outings';

/** `/outing/create`, optionally around a saved place: `?placeId=…&placeName=…`. */
export default function CreateOutingRoute() {
  const router = useRouter();
  const { placeId, placeName } = useLocalSearchParams<{ placeId?: string; placeName?: string }>();
  const place = placeId ? { id: placeId, name: placeName ?? '' } : null;

  return (
    <CreateOutingWizard
      place={place}
      onCreated={(outingId) =>
        router.replace({ pathname: '/outing/[id]/recap', params: { id: outingId } })
      }
      onClose={() => router.back()}
    />
  );
}
