import { useQuery } from '@tanstack/react-query';
import { getMockReviewPayload } from '../data/reviewLocales.js';
import { wikiTitles } from '../data/wikiTitles.js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

function wikiBase(language) {
  return language === 'zh' ? 'https://zh.wikipedia.org' : 'https://en.wikipedia.org';
}

async function fetchWikipediaBrief(landmarkId, language) {
  const title = (wikiTitles[landmarkId] ?? {})[language === 'zh' ? 'zh' : 'en'];
  if (!title) return getMockReviewPayload(landmarkId, language);

  const base = wikiBase(language);
  const url = `${base}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) return getMockReviewPayload(landmarkId, language);
  const json = await response.json();

  const pageUrl = json.content_urls?.desktop?.page ?? `${base}/wiki/${encodeURIComponent(title)}`;
  return {
    mode: 'wikipedia',
    landmark_id: landmarkId,
    average_score: null,
    review_count: 1,
    reviews: [
      {
        id: `wikipedia-${landmarkId}-${language}`,
        author: 'Wikipedia',
        score: null,
        comment: json.extract ?? '',
        source: pageUrl,
      },
    ],
  };
}

async function fetchLandmarkReviews(landmarkId, language) {
  if (!apiBaseUrl) return fetchWikipediaBrief(landmarkId, language);

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
