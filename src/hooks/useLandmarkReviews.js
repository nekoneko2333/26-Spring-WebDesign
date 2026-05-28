import { useQuery } from '@tanstack/react-query';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

async function fetchLandmarkReviews(landmarkId, language) {
  const response = await fetch(`${apiBaseUrl}/api/landmarks/${landmarkId}/reviews?language=${language}`);
  if (!response.ok) throw new Error(`Failed to load reviews from backend: ${response.status}`);
  return response.json();
}

export function useLandmarkReviews(landmarkId, language = 'en') {
  return useQuery({
    queryKey: ['landmark-reviews', landmarkId, language, apiBaseUrl],
    queryFn: () => fetchLandmarkReviews(landmarkId, language),
    enabled: Boolean(landmarkId),
    staleTime: 60_000,
  });
}
