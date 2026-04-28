import { useQuery } from '@tanstack/react-query';
import { wikiTitles } from '../data/wikiTitles.js';

function getTitle(landmarkId, language) {
  const entry = wikiTitles[landmarkId];
  if (!entry) return null;
  return language === 'zh' ? entry.zh : entry.en;
}

function wikiBase(language) {
  return language === 'zh' ? 'https://zh.wikipedia.org' : 'https://en.wikipedia.org';
}

async function fetchSummary(title, language) {
  const base = wikiBase(language);
  const url = `${base}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Failed to load Wikipedia summary');
  const json = await response.json();

  return {
    mode: 'wikipedia',
    title: json.title ?? title,
    extract: json.extract ?? '',
    url: json.content_urls?.desktop?.page ?? `${base}/wiki/${encodeURIComponent(title)}`,
    thumbnail: json.thumbnail?.source ?? null,
  };
}

export function useWikipediaSummary(landmarkId, language = 'en') {
  const title = getTitle(landmarkId, language);

  return useQuery({
    queryKey: ['wiki-summary', landmarkId, language],
    queryFn: () => fetchSummary(title, language),
    enabled: Boolean(title),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

