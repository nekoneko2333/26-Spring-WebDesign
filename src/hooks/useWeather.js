import { useQuery } from '@tanstack/react-query';
import { travelLandmarkMeta } from '../data/travelGuide.js';

function weatherUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

async function fetchWeather(lat, lon) {
  const response = await fetch(weatherUrl(lat, lon), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Failed to load weather');
  const json = await response.json();
  const current = json.current ?? {};
  return {
    mode: 'open-meteo',
    temperatureC: current.temperature_2m ?? null,
    weatherCode: current.weather_code ?? null,
    windKph: current.wind_speed_10m ?? null,
    time: current.time ?? null,
  };
}

export function useWeatherForLandmark(landmarkId) {
  const meta = travelLandmarkMeta[landmarkId];
  const lat = meta?.lat ?? null;
  const lon = meta?.lon ?? null;

  return useQuery({
    queryKey: ['weather', landmarkId],
    queryFn: () => fetchWeather(lat, lon),
    enabled: Number.isFinite(lat) && Number.isFinite(lon),
    staleTime: 10 * 60 * 1000,
  });
}

