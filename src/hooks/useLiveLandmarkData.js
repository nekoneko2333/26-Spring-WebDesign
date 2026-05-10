import { useQuery } from '@tanstack/react-query';

async function fetchLiveLandmarkData() {
  const response = await fetch('/data/live-landmarks.json', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load live landmark data');
  return response.json();
}

export function useLiveLandmarkData() {
  return useQuery({
    queryKey: ['live-landmark-data'],
    queryFn: fetchLiveLandmarkData,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLiveLandmarkIndex() {
  const query = useLiveLandmarkData();
  const index = new Map((query.data?.items ?? []).map((item) => [item.id, item]));
  return { ...query, index, route: query.data?.route ?? null, generatedAt: query.data?.generatedAt ?? null };
}
