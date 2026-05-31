import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'public', 'data', 'live-landmarks.json');
const USER_AGENT = 'web3d-project-live-data/1.0 (local development)';

const LANDMARKS = [
  {
    id: 'milan_duomo',
    wikidataId: 'Q18068',
    wiki: { en: 'Milan Cathedral', zh: '\u7c73\u5170\u4e3b\u6559\u5ea7\u5802' },
    lat: 45.4642,
    lon: 9.1919,
  },
  {
    id: 'venice_rialto',
    wikidataId: 'Q52505',
    wiki: { en: 'Rialto Bridge', zh: '\u91cc\u4e9a\u6258\u6865' },
    lat: 45.438,
    lon: 12.3359,
  },
  {
    id: 'florence_duomo',
    wikidataId: 'Q207528',
    wiki: { en: 'Florence Cathedral', zh: '\u4f5b\u7f57\u4f26\u8428\u4e3b\u6559\u5ea7\u5802' },
    lat: 43.7731,
    lon: 11.2558,
  },
  {
    id: 'pisa',
    wikidataId: 'Q39054',
    wiki: { en: 'Leaning Tower of Pisa', zh: '\u6bd4\u8428\u659c\u5854' },
    lat: 43.723,
    lon: 10.3963,
  },
  {
    id: 'colosseum',
    wikidataId: 'Q10285',
    wiki: { en: 'Colosseum', zh: '\u7f57\u9a6c\u6597\u517d\u573a' },
    lat: 41.8902,
    lon: 12.4922,
  },
  {
    id: 'pompeii',
    wikidataId: 'Q43332',
    wiki: { en: 'Pompeii', zh: '\u5e9e\u8d1d\u53e4\u57ce' },
    lat: 40.748,
    lon: 14.487,
  },
  { id: 'pantheon_rome', wiki: { en: 'Pantheon, Rome', zh: '\u4e07\u795e\u6bbf (\u7f57\u9a6c)' }, lat: 41.8986, lon: 12.4768 },
  { id: 'trevi_fountain', wiki: { en: 'Trevi Fountain', zh: '\u7279\u83b1\u7ef4\u55b7\u6cc9' }, lat: 41.9009, lon: 12.4833 },
  { id: 'roman_forum', wiki: { en: 'Roman Forum', zh: '\u53e4\u7f57\u9a6c\u5e7f\u573a' }, lat: 41.8925, lon: 12.4853 },
  { id: 'uffizi_gallery', wiki: { en: 'Uffizi', zh: '\u4e4c\u83f2\u5179\u7f8e\u672f\u9986' }, lat: 43.7687, lon: 11.2553 },
  { id: 'siena_cathedral', wiki: { en: 'Siena Cathedral', zh: '\u9521\u8036\u7eb3\u4e3b\u6559\u5ea7\u5802' }, lat: 43.3177, lon: 11.3287 },
  { id: 'verona_arena', wiki: { en: 'Verona Arena', zh: '\u7ef4\u7f57\u7eb3\u5706\u5f62\u7ade\u6280\u573a' }, lat: 45.4386, lon: 10.9944 },
  { id: 'st_marks_basilica', wiki: { en: "St Mark's Basilica", zh: '\u5723\u9a6c\u5c14\u8c37\u5723\u6bbf\u5b97\u4e3b\u6559\u5ea7\u5802' }, lat: 45.4345, lon: 12.3397 },
  { id: 'doges_palace', wiki: { en: "Doge's Palace", zh: '\u603b\u7763\u5bab (\u5a01\u5c3c\u65af)' }, lat: 45.4337, lon: 12.3404 },
  { id: 'cinque_terre', wiki: { en: 'Cinque Terre', zh: '\u4e94\u6e14\u6751' }, lat: 44.1461, lon: 9.7089 },
  { id: 'lake_como', wiki: { en: 'Lake Como', zh: '\u79d1\u83ab\u6e56' }, lat: 45.9871, lon: 9.2572 },
  { id: 'mole_antonelliana', wiki: { en: 'Mole Antonelliana', zh: '\u5b89\u6258\u5185\u5229\u5c16\u5854' }, lat: 45.0691, lon: 7.6931 },
  { id: 'san_vitale_ravenna', wiki: { en: 'Basilica of San Vitale', zh: '\u5723\u7ef4\u5854\u6559\u5802' }, lat: 44.4208, lon: 12.1964 },
  { id: 'assisi_basilica', wiki: { en: 'Basilica of Saint Francis of Assisi', zh: '\u4e9a\u897f\u897f\u7684\u5723\u65b9\u6d4e\u5404\u5723\u6bbf' }, lat: 43.0747, lon: 12.6264 },
  { id: 'caserta_palace', wiki: { en: 'Royal Palace of Caserta', zh: '\u5361\u585e\u5854\u738b\u5bab' }, lat: 41.0731, lon: 14.3275 },
  { id: 'herculaneum', wiki: { en: 'Herculaneum', zh: '\u8d6b\u5e93\u5170\u5c3c\u59c6' }, lat: 40.8059, lon: 14.3487 },
  { id: 'paestum', wiki: { en: 'Paestum', zh: '\u5e15\u57c3\u65af\u56fe\u59c6' }, lat: 40.4197, lon: 15.0059 },
  { id: 'matera_sassi', wiki: { en: 'Sassi di Matera', zh: '\u9a6c\u6cf0\u62c9\u6d1e\u7a9f\u6c11\u5c45' }, lat: 40.6664, lon: 16.6106 },
  { id: 'alberobello_trulli', wiki: { en: 'Alberobello', zh: '\u963f\u5c14\u8d1d\u7f57\u8d1d\u6d1b' }, lat: 40.7829, lon: 17.2365 },
  { id: 'castel_del_monte', wiki: { en: 'Castel del Monte, Apulia', zh: '\u8499\u7279\u57ce\u5821' }, lat: 41.0847, lon: 16.2707 },
  { id: 'amalfi_coast', wiki: { en: 'Amalfi Coast', zh: '\u963f\u9a6c\u5c14\u83f2\u6d77\u5cb8' }, lat: 40.634, lon: 14.6027 },
  { id: 'valley_of_temples', wiki: { en: 'Valle dei Templi', zh: '\u795e\u6bbf\u4e4b\u8c37' }, lat: 37.2894, lon: 13.5933 },
  { id: 'mount_etna', wiki: { en: 'Mount Etna', zh: '\u57c3\u7279\u7eb3\u706b\u5c71' }, lat: 37.751, lon: 14.9958 },
  { id: 'palermo_cathedral', wiki: { en: 'Palermo Cathedral', zh: '\u5df4\u52d2\u83ab\u4e3b\u6559\u5ea7\u5802' }, lat: 38.1144, lon: 13.3564 },
  { id: 'nuraghe_su_nuraxi', wiki: { en: 'Su Nuraxi di Barumini', zh: '\u5df4\u9c81\u7c73\u5c3c\u7684\u52aa\u62c9\u5409' }, lat: 39.7056, lon: 8.9918 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProxyUrl(target) {
  if (target.protocol === 'https:') {
    return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
  }
  return process.env.HTTP_PROXY || process.env.http_proxy || null;
}

function readHttpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = buffer.subarray(0, headerEnd).toString('utf8');
      const statusLine = header.split('\r\n')[0] ?? '';
      const status = Number(statusLine.split(/\s+/)[1]);
      cleanup();
      resolve({ status, rest: buffer.subarray(headerEnd + 4) });
    };
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

function connectViaProxy(target, proxy) {
  return new Promise((resolve, reject) => {
    const proxyUrl = new URL(proxy);
    const proxySocket = net.connect(Number(proxyUrl.port || 80), proxyUrl.hostname);
    proxySocket.setTimeout(30_000, () => proxySocket.destroy(new Error('Proxy connection timed out')));
    proxySocket.once('connect', async () => {
      const auth = proxyUrl.username
        ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString('base64')}\r\n`
        : '';
      proxySocket.write(`CONNECT ${target.hostname}:443 HTTP/1.1\r\nHost: ${target.hostname}:443\r\n${auth}Connection: close\r\n\r\n`);
      try {
        const { status, rest } = await readHttpResponse(proxySocket);
        if (status !== 200) {
          reject(new Error(`Proxy CONNECT failed with ${status}`));
          return;
        }

        const secureSocket = tls.connect({
          socket: proxySocket,
          servername: target.hostname,
        }, () => {
          if (rest.length > 0) secureSocket.unshift(rest);
          resolve(secureSocket);
        });
        secureSocket.once('error', reject);
      } catch (error) {
        reject(error);
      }
    });
    proxySocket.once('error', reject);
  });
}

async function requestJsonOnce(url, options = {}) {
  const target = new URL(url);
  const headers = {
    accept: 'application/json',
    'user-agent': USER_AGENT,
    ...(options.headers ?? {}),
  };
  const proxy = getProxyUrl(target);

  return new Promise(async (resolve, reject) => {
    const requestOptions = {
      method: 'GET',
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      headers,
      timeout: 30_000,
    };

    if (proxy && target.protocol === 'https:') {
      const agent = new https.Agent();
      agent.createConnection = (_options, callback) => {
        connectViaProxy(target, proxy).then((socket) => callback(null, socket), callback);
      };
      requestOptions.agent = agent;
    }

    const client = target.protocol === 'https:' ? https : http;
    const request = client.request(requestOptions, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const statusCode = response.statusCode ?? 500;
        if (statusCode >= 400) {
          const retryAfter = Number(response.headers['retry-after'] ?? 0);
          const error = new Error(`${statusCode} ${response.statusMessage} for ${url}`);
          error.statusCode = statusCode;
          error.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
          reject(error);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('timeout', () => request.destroy(new Error(`Request timed out for ${url}`)));
    request.on('error', reject);
    request.end();
  });
}

async function fetchJson(url, options = {}) {
  const attempts = options.attempts ?? 4;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJsonOnce(url, options);
    } catch (error) {
      const retryable = error.statusCode === 429 || error.statusCode >= 500 || /timed out|timeout|ECONNRESET|socket disconnected/i.test(`${error.code ?? ''} ${error.message}`);
      if (!retryable || attempt === attempts) throw error;
      const waitMs = error.retryAfterMs || 1200 * attempt;
      await sleep(waitMs);
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

function wikiBase(language) {
  return language === 'zh' ? 'https://zh.wikipedia.org' : 'https://en.wikipedia.org';
}

async function fetchWikipediaSummary(title, language) {
  const base = wikiBase(language);
  const url = `${base}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const json = await fetchJson(url);

  return {
    title: json.title ?? title,
    extract: json.extract ?? '',
    pageUrl: json.content_urls?.desktop?.page ?? `${base}/wiki/${encodeURIComponent(title)}`,
    thumbnail: json.thumbnail?.source ?? null,
    wikibaseItem: json.wikibase_item ?? null,
    source: 'wikipedia',
  };
}

function fallbackWikipediaSummary(title, language) {
  const base = wikiBase(language);
  return {
    title,
    extract: '',
    pageUrl: `${base}/wiki/${encodeURIComponent(title)}`,
    thumbnail: null,
    wikibaseItem: null,
    source: 'wikipedia',
  };
}

async function fetchWikidataRows(ids) {
  const safeIds = ids.filter(Boolean);
  if (safeIds.length === 0) return [];
  const values = safeIds.map((id) => `wd:${id}`).join(' ');
  const query = `
SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?heritageId WHERE {
  VALUES ?item { ${values} }
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P1435 ?heritageId. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
}`;
  const params = new URLSearchParams({ query, format: 'json' });
  const json = await fetchJson(`https://query.wikidata.org/sparql?${params.toString()}`, {
    headers: { accept: 'application/sparql-results+json' },
  });

  return json.results.bindings.map((row) => ({
    wikidataId: row.item?.value?.split('/').pop() ?? null,
    label: row.itemLabel?.value ?? null,
    description: row.itemDescription?.value ?? null,
    coord: row.coord?.value ?? null,
    image: row.image?.value ?? null,
    heritageId: row.heritageId?.value?.split('/').pop() ?? null,
  }));
}

function parsePoint(point) {
  const match = String(point ?? '').match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
  if (!match) return null;
  return { lon: Number(match[1]), lat: Number(match[2]) };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const json = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  const current = json.current ?? {};
  return {
    temperatureC: current.temperature_2m ?? null,
    weatherCode: current.weather_code ?? null,
    windKph: current.wind_speed_10m ?? null,
    observedAt: current.time ?? null,
    source: 'open-meteo',
  };
}

function fallbackWeather() {
  return {
    temperatureC: null,
    weatherCode: null,
    windKph: null,
    observedAt: null,
    source: 'open-meteo',
  };
}

async function fetchRouteMetrics(landmarks) {
  const encoded = landmarks.map((item) => `${item.lon},${item.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=false&annotations=false&steps=false`;
  const json = await fetchJson(url);
  const route = json.routes?.[0];
  return {
    distanceKm: route?.distance ? Number((route.distance / 1000).toFixed(1)) : null,
    durationHours: route?.duration ? Number((route.duration / 3600).toFixed(2)) : null,
    source: 'osrm',
  };
}

async function main() {
  const resolved = [];
  for (const [index, landmark] of LANDMARKS.entries()) {
    console.log(`Fetching ${index + 1}/${LANDMARKS.length}: ${landmark.id}`);
    const summaryEn = await fetchWikipediaSummary(landmark.wiki.en, 'en').catch(() => fallbackWikipediaSummary(landmark.wiki.en, 'en'));
    await sleep(250);
    const summaryZh = await fetchWikipediaSummary(landmark.wiki.zh, 'zh').catch(() => null);
    const weather = await fetchWeather(landmark.lat, landmark.lon).catch(() => fallbackWeather());
    resolved.push({
      landmark,
      summaryEn,
      summaryZh,
      weather,
      wikidataId: landmark.wikidataId ?? summaryEn.wikibaseItem ?? null,
    });
    await sleep(650);
  }

  const wikidataRows = await fetchWikidataRows([...new Set(resolved.map((item) => item.wikidataId).filter(Boolean))]);
  const wikidataById = new Map(wikidataRows.map((row) => [row.wikidataId, row]));

  const items = [];
  for (const { landmark, summaryEn, summaryZh, weather, wikidataId } of resolved) {
    const wikidata = wikidataById.get(wikidataId) ?? {};
    const wikidataCoord = parsePoint(wikidata.coord);
    const coords = wikidataCoord ?? { lat: landmark.lat, lon: landmark.lon };

    items.push({
      id: landmark.id,
      wikidataId,
      name: {
        en: summaryEn.title,
        zh: summaryZh?.title ?? landmark.wiki.zh,
      },
      coordinates: coords,
      wikidata: {
        label: wikidata.label ?? null,
        description: wikidata.description ?? null,
        image: wikidata.image ?? null,
        heritageId: wikidata.heritageId ?? null,
        source: wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : null,
      },
      wikipedia: {
        en: summaryEn,
        zh: summaryZh,
      },
      weather,
    });

  }

  const route = await fetchRouteMetrics(LANDMARKS).catch((error) => {
    console.warn(`Route fetch failed: ${error.message}`);
    return { distanceKm: null, durationHours: null, source: 'osrm' };
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      wikidata: 'https://query.wikidata.org/sparql',
      wikipedia: 'https://www.mediawiki.org/wiki/API_REST_API',
      weather: 'https://open-meteo.com/en/docs',
      routing: 'https://project-osrm.org/',
    },
    items,
    route,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${items.length} landmarks to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Route: ${route.distanceKm} km, ${route.durationHours} h`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
