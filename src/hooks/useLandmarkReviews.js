import { useQuery } from '@tanstack/react-query';
import { getMockReviewPayload } from '../data/reviewLocales.js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

async function fetchLandmarkReviews(landmarkId, language) {
  if (!apiBaseUrl) return getMockReviewPayload(landmarkId, language);

  const response = await fetch(`${apiBaseUrl}/api/landmarks/${landmarkId}/reviews?language=${language}`);
  if (!response.ok) throw new Error('Failed to load reviews');
  return response.json();
}

export function useLandmarkReviews(landmarkId, language = 'en') {
  return useQuery({
    queryKey: ['landmark-reviews', landmarkId, language, apiBaseUrl ?? 'local-mock'],
    queryFn: () => fetchLandmarkReviews(landmarkId, language),
    enabled: Boolean(landmarkId),
    staleTime: 60_000,
  });
}
