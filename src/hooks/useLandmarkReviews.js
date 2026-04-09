import { useQuery } from '@tanstack/react-query';

async function fetchLandmarkReviews(landmarkId) {
  const response = await fetch(`http://127.0.0.1:8000/api/landmarks/${landmarkId}/reviews`);
  if (!response.ok) throw new Error('Failed to load reviews');
  return response.json();
}

export function useLandmarkReviews(landmarkId) {
  return useQuery({
    queryKey: ['landmark-reviews', landmarkId],
    queryFn: () => fetchLandmarkReviews(landmarkId),
    enabled: Boolean(landmarkId),
    staleTime: 60_000,
  });
}
