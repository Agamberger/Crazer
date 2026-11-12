import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CreateOutingScreen } from '@/features/outings';

/**
 * `/outing/create`, optionally around a saved place (`?placeId=…&placeName=…`) or
 * with a ready-made name (`?title=…`, e.g. from a not retained activity). Opens the hub once created.
 */
export default function CreateOutingRoute() {
  const router = useRouter();
  const { placeId, placeName, title } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
    title?: string;
  }>();
  const place = placeId ? { id: placeId, name: placeName ?? '' } : null;

  return (
    <CreateOutingScreen
      place={place}
      initialTitle={title}
      onCreated={(outingId) =>
        router.replace({ pathname: '/outing/[id]', params: { id: outingId } })
      }
      onClose={() => router.back()}
    />
  );
}
