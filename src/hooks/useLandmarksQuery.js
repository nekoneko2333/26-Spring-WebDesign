import { useQuery } from '@tanstack/react-query';

async function fetchLandmarks() {
  const response = await fetch('http://127.0.0.1:8000/api/landmarks');
  if (!response.ok) throw new Error('Failed to load landmarks');
  return response.json();
}

export function useLandmarksQuery() {
  return useQuery({
    queryKey: ['landmarks'],
    queryFn: fetchLandmarks,
    staleTime: 5 * 60_000,
  });
}
