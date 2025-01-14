'use client';

import { Action } from '@prisma/client';
import useSWR from 'swr';

export function useActions(userId?: string) {
  const {
    data: actions,
    isLoading,
    error,
    mutate,
  } = useSWR<Action[]>(
    userId ? '/api/actions' : null,
    async (url) => {
      console.log('[Actions Hook] Fetching actions for user:', userId);
      const res = await fetch(url);
      const data = await res.json();
      console.log('[Actions Hook] Fetched actions:', data);
      return data;
    },
    {
      revalidateOnFocus: false,
    },
  );

  if (error) {
    console.error('Hook: Error fetching actions:', error);
  }

  return {
    actions,
    isLoading,
    error,
    mutate,
  };
}
