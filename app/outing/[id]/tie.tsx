import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityTieBreak } from '@/features/outings';

/** `/outing/[id]/tie?day=YYYY-MM-DD` — without `day`, the « any day » group. */
export default function OutingTieRoute() {
  const router = useRouter();
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/outing/[id]/activities', params: { id } });
  };

  return (
    <ActivityTieBreak
      outingId={id}
      day={day ?? null}
      onConvert={(result) =>
        router.push({ pathname: '/outing/create', params: { title: result.activity.title } })
      }
      onClose={close}
    />
  );
}
