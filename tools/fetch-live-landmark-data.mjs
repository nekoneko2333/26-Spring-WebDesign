import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';

const ROOT = process.cwd();
const OUT_FILE = path.resolve(process.env.LANDMARK_OUT_FILE ?? path.join(ROOT, 'public', 'data', 'live-landmarks.json'));
const CHECKPOINT_FILE = path.resolve(process.env.LANDMARK_CHECKPOINT_FILE ?? `${OUT_FILE}.checkpoint.json`);
const EXISTING_DATA_FILE = path.resolve(process.env.LANDMARK_EXISTING_FILE ?? path.join(ROOT, 'public', 'data', 'live-landmarks.json'));
const USER_AGENT = 'web3d-project-live-data/1.0 (local development)';
const TARGET_LANDMARK_COUNT = Number(process.env.LANDMARK_COUNT ?? 500);
const ROUTING_MATRIX_LIMIT = Number(process.env.ROUTING_MATRIX_LIMIT ?? 0);
const FAST_CATALOG_ONLY = process.env.FAST_CATALOG_ONLY === '1';
const EXCLUDED_WIKIDATA_IDS = new Set([
  'Q43032',   // Bellano municipality
  'Q72356',   // Poggiomarino municipality
  'Q39092',   // Piantedo municipality
  'Q42790',   // Ballabio municipality
  'Q190542',  // Costa Concordia shipwreck
  'Q40183',   // Novate Mezzola municipality
  'Q40660',   // Dubino municipality
  'Q47416',   // Sorico municipality
]);

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
    wikidataId: 'Q191739',
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

const DISCOVERY_ROOT_KINDS = {
  Q570116: 'monument',
  Q33506: 'museum',
  Q16970: 'cathedral',
  Q23413: 'castle',
  Q839954: 'ruins',
  Q4989906: 'monument',
  Q16560: 'palace',
  Q8502: 'mountain',
  Q23397: 'lake',
  Q12280: 'bridge',
  Q24354: 'theatre',
  Q174782: 'archaeological-site',
  Q1107656: 'garden',
  Q22698: 'park',
  Q39614: 'cemetery',
  Q4989906: 'memorial',
};

const TRADITIONAL_CHINESE_PATTERN = /[臺灣體義廣東門風龍國學藝覽觀讓變關開聖羅蘭橋宮館萬與興會專業歷遺跡區劃價資資訊電話預約時閉間號頁點鄉縣車鐵線館]/;
const SIMPLIFY_PAIRS = [
  ['臺', '台'], ['灣', '湾'], ['體', '体'], ['義', '义'], ['廣', '广'], ['東', '东'],
  ['門', '门'], ['風', '风'], ['龍', '龙'], ['國', '国'], ['學', '学'], ['藝', '艺'],
  ['覽', '览'], ['觀', '观'], ['讓', '让'], ['變', '变'], ['關', '关'], ['開', '开'],
  ['聖', '圣'], ['羅', '罗'], ['蘭', '兰'], ['橋', '桥'], ['宮', '宫'], ['館', '馆'],
  ['萬', '万'], ['與', '与'], ['興', '兴'], ['會', '会'], ['專', '专'], ['業', '业'],
  ['歷', '历'], ['遺', '遗'], ['跡', '迹'], ['區', '区'], ['劃', '划'], ['價', '价'],
  ['資', '资'], ['訊', '讯'], ['電', '电'], ['話', '话'], ['預', '预'], ['約', '约'],
  ['時', '时'], ['閉', '闭'], ['間', '间'], ['號', '号'], ['頁', '页'], ['點', '点'],
  ['鄉', '乡'], ['縣', '县'], ['車', '车'], ['鐵', '铁'], ['線', '线'], ['圓', '圆'],
  ['鬥', '斗'], ['獸', '兽'], ['場', '场'], ['爾', '尔'], ['橫', '横'], ['運', '运'],
  ['樑', '梁'], ['屬', '属'], ['復', '复'], ['稱', '称'], ['兩', '两'], ['馬', '马'],
  ['競', '竞'], ['劇', '剧'], ['現', '现'], ['從', '从'], ['費', '费'], ['個', '个'],
  ['紀', '纪'], ['歐', '欧'], ['倫', '伦'], ['薩', '萨'], ['總', '总'], ['終', '终'],
  ['貢', '贡'], ['建築', '建筑'], ['設計', '设计'], ['傾', '倾'], ['頂', '顶'],
  ['亞', '亚'], ['據', '据'], ['廟', '庙'], ['獻', '献'], ['後', '后'], ['憑', '凭'],
  ['藉', '借'], ['謹', '谨'], ['嚴', '严'], ['幾', '几'], ['譽', '誉'], ['認', '认'],
  ['噴', '喷'], ['遊', '游'], ['許', '许'], ['願', '愿'], ['導', '导'], ['鐘', '钟'],
  ['樓', '楼'], ['舊', '旧'], ['來', '来'], ['處', '处'], ['頭', '头'], ['條', '条'],
  ['戶', '户'], ['務', '务'], ['數', '数'], ['庫', '库'], ['寫', '写'], ['歲', '岁'],
  ['報', '报'], ['應', '应'], ['環', '环'], ['島', '岛'], ['濱', '滨'], ['參', '参'],
  ['團', '团'], ['營', '营'], ['裝', '装'], ['裡', '里'],
];
const SIMPLIFY_MAP = new Map(SIMPLIFY_PAIRS.filter(([from]) => from.length === 1));
const SIMPLIFY_PHRASES = SIMPLIFY_PAIRS.filter(([from]) => from.length > 1);
const simplifyCache = new Map();

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
    proxySocket.setTimeout(Number(process.env.HTTP_TIMEOUT_MS ?? 60_000), () => proxySocket.destroy(new Error('Proxy connection timed out')));
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
      timeout: Number(process.env.HTTP_TIMEOUT_MS ?? 60_000),
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
  if (language === 'zh') {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      redirects: '1',
      prop: 'extracts|pageimages|pageprops|info',
      exintro: '1',
      explaintext: '1',
      inprop: 'url',
      piprop: 'thumbnail',
      pithumbsize: '640',
      variant: 'zh-cn',
      titles: title,
    });
    const json = await fetchJson(`${base}/w/api.php?${params.toString()}`);
    const page = json.query?.pages?.[0] ?? {};
    return {
      title: page.title ?? title,
      extract: page.extract ?? '',
      pageUrl: page.fullurl ?? `${base}/wiki/${encodeURIComponent(title)}`,
      thumbnail: page.thumbnail?.source ?? null,
      wikibaseItem: page.pageprops?.wikibase_item ?? null,
      source: 'wikipedia',
      variant: 'zh-cn',
    };
  }
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

async function fetchWikidataRows(ids) {
  const safeIds = ids.filter(Boolean);
  if (safeIds.length === 0) return [];
  if (safeIds.length > 5) {
    const rows = [];
    for (let index = 0; index < safeIds.length; index += 5) {
      rows.push(...await fetchWikidataRows(safeIds.slice(index, index + 5)));
      console.log(`Wikidata metadata ${Math.min(index + 5, safeIds.length)}/${safeIds.length}`);
      await sleep(300);
    }
    return rows;
  }
  const values = safeIds.map((id) => `wd:${id}`).join(' ');
  const query = `
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?heritageId ?officialWebsite ?openDays ?ticketFee
  ?inception ?streetAddress ?phone ?email ?postalCode ?wheelchair ?visitorCount
  ?admin ?adminLabelEn ?adminLabelZh ?province ?provinceLabelEn ?provinceLabelZh
  ?country ?countryLabelEn ?countryLabelZh ?location ?locationLabelEn ?locationLabelZh
  ?instance ?instanceLabel ?enWikiTitle ?zhWikiTitle WHERE {
  VALUES ?item { ${values} }
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P1435 ?heritageId. }
  OPTIONAL { ?item wdt:P856 ?officialWebsite. }
  OPTIONAL { ?item wdt:P3025 ?openDays. }
  OPTIONAL { ?item wdt:P2555 ?ticketFee. }
  OPTIONAL { ?item wdt:P571 ?inception. }
  OPTIONAL { ?item wdt:P6375 ?streetAddress. }
  OPTIONAL { ?item wdt:P1329 ?phone. }
  OPTIONAL { ?item wdt:P968 ?email. }
  OPTIONAL { ?item wdt:P281 ?postalCode. }
  OPTIONAL { ?item wdt:P2846 ?wheelchair. }
  OPTIONAL { ?item wdt:P1174 ?visitorCount. }
  OPTIONAL { ?item wdt:P131 ?admin. }
  OPTIONAL { ?admin wdt:P131 ?province. }
  OPTIONAL { ?item wdt:P17 ?country. }
  OPTIONAL { ?item wdt:P276 ?location. }
  OPTIONAL { ?item wdt:P31 ?instance. }
  OPTIONAL { ?admin rdfs:label ?adminLabelEn. FILTER(LANG(?adminLabelEn) = "en") }
  OPTIONAL { ?admin rdfs:label ?adminLabelZh. FILTER(LANG(?adminLabelZh) IN ("zh", "zh-hans", "zh-cn")) }
  OPTIONAL { ?province rdfs:label ?provinceLabelEn. FILTER(LANG(?provinceLabelEn) = "en") }
  OPTIONAL { ?province rdfs:label ?provinceLabelZh. FILTER(LANG(?provinceLabelZh) IN ("zh", "zh-hans", "zh-cn")) }
  OPTIONAL { ?country rdfs:label ?countryLabelEn. FILTER(LANG(?countryLabelEn) = "en") }
  OPTIONAL { ?country rdfs:label ?countryLabelZh. FILTER(LANG(?countryLabelZh) IN ("zh", "zh-hans", "zh-cn")) }
  OPTIONAL { ?location rdfs:label ?locationLabelEn. FILTER(LANG(?locationLabelEn) = "en") }
  OPTIONAL { ?location rdfs:label ?locationLabelZh. FILTER(LANG(?locationLabelZh) IN ("zh", "zh-hans", "zh-cn")) }
  OPTIONAL {
    ?enArticle schema:about ?item;
      schema:isPartOf <https://en.wikipedia.org/>;
      schema:name ?enWikiTitle.
  }
  OPTIONAL {
    ?zhArticle schema:about ?item;
      schema:isPartOf <https://zh.wikipedia.org/>;
      schema:name ?zhWikiTitle.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "zh-cn,zh-hans,zh,en". }
}`;
  const params = new URLSearchParams({ query, format: 'json' });
  const json = await fetchJson(`https://query.wikidata.org/sparql?${params.toString()}`, {
    headers: { accept: 'application/sparql-results+json' },
  });

  const rows = new Map();
  json.results.bindings.forEach((row) => {
    const wikidataId = row.item?.value?.split('/').pop() ?? null;
    if (!wikidataId) return;
    const current = rows.get(wikidataId) ?? { wikidataId };
    rows.set(wikidataId, {
      ...current,
      label: current.label ?? row.itemLabel?.value ?? null,
      description: current.description ?? row.itemDescription?.value ?? null,
      coord: current.coord ?? row.coord?.value ?? null,
      image: current.image ?? row.image?.value ?? null,
      heritageId: current.heritageId ?? row.heritageId?.value?.split('/').pop() ?? null,
      officialWebsite: current.officialWebsite ?? row.officialWebsite?.value ?? null,
      openDays: current.openDays ?? row.openDays?.value ?? null,
      ticketFee: current.ticketFee ?? row.ticketFee?.value ?? null,
      inception: current.inception ?? row.inception?.value ?? null,
      streetAddress: current.streetAddress ?? row.streetAddress?.value ?? null,
      phone: current.phone ?? row.phone?.value ?? null,
      email: current.email ?? row.email?.value ?? null,
      postalCode: current.postalCode ?? row.postalCode?.value ?? null,
      wheelchair: current.wheelchair ?? row.wheelchair?.value ?? null,
      visitorCount: current.visitorCount ?? row.visitorCount?.value ?? null,
      adminId: current.adminId ?? row.admin?.value?.split('/').pop() ?? null,
      adminLabelEn: current.adminLabelEn ?? row.adminLabelEn?.value ?? null,
      adminLabelZh: current.adminLabelZh ?? row.adminLabelZh?.value ?? null,
      provinceId: current.provinceId ?? row.province?.value?.split('/').pop() ?? null,
      provinceLabelEn: current.provinceLabelEn ?? row.provinceLabelEn?.value ?? null,
      provinceLabelZh: current.provinceLabelZh ?? row.provinceLabelZh?.value ?? null,
      countryId: current.countryId ?? row.country?.value?.split('/').pop() ?? null,
      countryLabelEn: current.countryLabelEn ?? row.countryLabelEn?.value ?? null,
      countryLabelZh: current.countryLabelZh ?? row.countryLabelZh?.value ?? null,
      locationId: current.locationId ?? row.location?.value?.split('/').pop() ?? null,
      locationLabelEn: current.locationLabelEn ?? row.locationLabelEn?.value ?? null,
      locationLabelZh: current.locationLabelZh ?? row.locationLabelZh?.value ?? null,
      instanceIds: [...new Set([...(current.instanceIds ?? []), row.instance?.value?.split('/').pop()].filter(Boolean))],
      instanceLabels: [...new Set([...(current.instanceLabels ?? []), row.instanceLabel?.value].filter(Boolean))],
      enWikiTitle: current.enWikiTitle ?? row.enWikiTitle?.value ?? null,
      zhWikiTitle: current.zhWikiTitle ?? row.zhWikiTitle?.value ?? null,
    });
  });
  return [...rows.values()];
}

async function fetchOptionalWikidataRows(ids) {
  if (!ids.length || process.env.ENABLE_WIKIDATA_DETAILS !== '1') {
    console.log('[details] skipped by default; set ENABLE_WIKIDATA_DETAILS=1 to enrich opening hours, tickets, contact fields, and accessibility.');
    return [];
  }
  const startedAt = Date.now();
  const rows = [];
  for (let index = 0; index < ids.length; index += 5) {
    const chunk = ids.slice(index, index + 5);
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const percent = ((index / ids.length) * 100).toFixed(1);
    console.log(`[details] ${index}/${ids.length} ${percent}% elapsed=${elapsed}s`);
    const previousTimeout = process.env.HTTP_TIMEOUT_MS;
    process.env.HTTP_TIMEOUT_MS = String(process.env.DETAIL_TIMEOUT_MS ?? 15000);
    const chunkRows = await fetchWikidataRows(chunk).catch((error) => {
      console.log(`[details] skipped ${chunk.join(',')}: ${error.message}`);
      return [];
    }).finally(() => {
      if (previousTimeout === undefined) delete process.env.HTTP_TIMEOUT_MS;
      else process.env.HTTP_TIMEOUT_MS = previousTimeout;
    });
    rows.push(...chunkRows);
    await sleep(120);
  }
  console.log(`[details] ${ids.length}/${ids.length} 100.0%`);
  return rows;
}

async function discoverItalianLandmarks() {
  const rows = new Map();
  const roots = Object.entries(DISCOVERY_ROOT_KINDS);
  const discoveryStartedAt = Date.now();
  const addCandidate = (row, kind = 'landmark') => {
    const wikidataId = row.item?.value?.split('/').pop();
    const coordinates = parsePoint(row.coord?.value);
    if (!wikidataId || !coordinates || !row.enWikiTitle?.value || !row.zhWikiTitle?.value) return;
    if (coordinates.lon < 6.5 || coordinates.lon > 18.7 || coordinates.lat < 35.3 || coordinates.lat > 47.2) return;
    const current = rows.get(wikidataId);
    const candidate = {
      id: `italy_${wikidataId.toLowerCase()}`,
      wikidataId,
      wiki: {
        en: row.enWikiTitle.value,
        zh: row.zhWikiTitle.value,
      },
      lat: coordinates.lat,
      lon: coordinates.lon,
      kind,
      sitelinks: Number(row.sitelinks?.value ?? 0),
    };
    if (!current || candidate.sitelinks > current.sitelinks) rows.set(wikidataId, candidate);
  };
  for (const [rootIndex, [rootId, kind]] of roots.entries()) {
    const query = `
PREFIX schema: <http://schema.org/>
SELECT DISTINCT ?item ?coord ?enWikiTitle ?zhWikiTitle ?sitelinks WHERE {
  ?item wdt:P17 wd:Q38;
    wdt:P625 ?coord;
    wikibase:sitelinks ?sitelinks.
  {
    ?item wdt:P31 wd:${rootId}.
  } UNION {
    ?item wdt:P31 ?type.
    ?type wdt:P279 wd:${rootId}.
  }
  ?enArticle schema:about ?item;
    schema:isPartOf <https://en.wikipedia.org/>;
    schema:name ?enWikiTitle.
  ?zhArticle schema:about ?item;
    schema:isPartOf <https://zh.wikipedia.org/>;
    schema:name ?zhWikiTitle.
  FILTER(?sitelinks >= 4)
}
ORDER BY DESC(?sitelinks)
LIMIT 180`;
    const params = new URLSearchParams({ query, format: 'json' });
    const json = await fetchJson(`https://query.wikidata.org/sparql?${params.toString()}`, {
      attempts: 5,
      headers: { accept: 'application/sparql-results+json' },
    });
    for (const row of json.results.bindings) addCandidate(row, kind);
    const percent = (((rootIndex + 1) / roots.length) * 100).toFixed(1);
    const elapsed = Math.round((Date.now() - discoveryStartedAt) / 1000);
    console.log(`[discover categories] ${rootIndex + 1}/${roots.length} ${percent}% | ${rootId}=${json.results.bindings.length} raw | usable=${rows.size} elapsed=${elapsed}s`);
    await sleep(350);
  }
  if (rows.size < TARGET_LANDMARK_COUNT + 400) {
    for (let offset = 0; rows.size < TARGET_LANDMARK_COUNT + 400 && offset <= 3000; offset += 100) {
      const broadQuery = `
PREFIX schema: <http://schema.org/>
SELECT DISTINCT ?item ?coord ?enWikiTitle ?zhWikiTitle ?sitelinks WHERE {
  ?item wdt:P17 wd:Q38;
    wdt:P625 ?coord;
    wikibase:sitelinks ?sitelinks.
  ?enArticle schema:about ?item;
    schema:isPartOf <https://en.wikipedia.org/>;
    schema:name ?enWikiTitle.
  ?zhArticle schema:about ?item;
    schema:isPartOf <https://zh.wikipedia.org/>;
    schema:name ?zhWikiTitle.
  FILTER(?sitelinks >= 2)
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q5. }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q15284. }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q6256. }
}
ORDER BY DESC(?sitelinks)
LIMIT 100
OFFSET ${offset}`;
      const broadParams = new URLSearchParams({ query: broadQuery, format: 'json' });
      const broadJson = await fetchJson(`https://query.wikidata.org/sparql?${broadParams.toString()}`, {
        attempts: 4,
        headers: { accept: 'application/sparql-results+json' },
      }).catch((error) => {
        console.log(`Discovery broad offset ${offset} skipped: ${error.message}`);
        return null;
      });
      if (!broadJson) continue;
      console.log(`Discovery broad ${offset}-${offset + 99}: ${broadJson.results.bindings.length} candidates`);
      for (const row of broadJson.results.bindings) addCandidate(row, 'landmark');
      await sleep(80);
      if (broadJson.results.bindings.length < 100) break;
    }
  }
  return [...rows.values()].sort((a, b) => b.sitelinks - a.sitelinks);
}

async function buildLandmarkCatalog() {
  const seedIds = new Set(LANDMARKS.map((item) => item.wikidataId).filter(Boolean));
  const seedTitles = new Set(LANDMARKS.map((item) => item.wiki.en.toLowerCase()));
  const discovered = await discoverItalianLandmarks();
  const additions = discovered.filter((item) => (
    !seedIds.has(item.wikidataId)
    && !seedTitles.has(item.wiki.en.toLowerCase())
    && !EXCLUDED_WIKIDATA_IDS.has(item.wikidataId)
  ));
  const catalog = [...LANDMARKS, ...additions].slice(0, TARGET_LANDMARK_COUNT + 400);
  if (catalog.length < TARGET_LANDMARK_COUNT) {
    throw new Error(`Wikidata discovery returned only ${catalog.length}/${TARGET_LANDMARK_COUNT} usable Italian landmarks`);
  }
  return catalog;
}

async function loadExistingItems() {
  try {
    const payload = JSON.parse(await readFile(EXISTING_DATA_FILE, 'utf8'));
    return new Map((payload.items ?? []).map((item) => [item.wikidataId, item]));
  } catch {
    return new Map();
  }
}

async function loadCheckpoint() {
  if (process.env.RESUME_LANDMARK_FETCH === '0') return null;
  try {
    const checkpoint = JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8'));
    if (checkpoint?.targetCount !== TARGET_LANDMARK_COUNT) return null;
    return checkpoint;
  } catch {
    return null;
  }
}

async function saveCheckpoint(resolved, skippedIds) {
  const checkpoint = {
    targetCount: TARGET_LANDMARK_COUNT,
    savedAt: new Date().toISOString(),
    resolvedCount: resolved.length,
    skippedIds: [...skippedIds],
    resolved: resolved.map((item) => ({
      landmark: item.landmark,
      summaryEn: item.summaryEn,
      summaryZh: item.summaryZh,
      weather: item.weather,
      wikidataId: item.wikidataId,
      cached: Boolean(item.cached),
    })),
  };
  await writeFile(CHECKPOINT_FILE, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

function parsePoint(point) {
  const match = String(point ?? '').match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
  if (!match) return null;
  return { lon: Number(match[1]), lat: Number(match[2]) };
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyChineseText(value) {
  const raw = String(value ?? '');
  if (simplifyCache.has(raw)) return simplifyCache.get(raw);
  if (process.platform === 'win32' && /[\u4e00-\u9fff]/.test(String(value ?? ''))) {
    try {
      const converted = execFileSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(ROOT, 'tools', 'convert-text-to-simplified.ps1'),
        raw,
      ], { encoding: 'utf8', timeout: 5000 }).trim();
      simplifyCache.set(raw, converted);
      return converted;
    } catch {
      // Fall back to the local character map below.
    }
  }
  let output = raw;
  for (const [from, to] of SIMPLIFY_PHRASES) output = output.split(from).join(to);
  output = [...output].map((char) => SIMPLIFY_MAP.get(char) ?? char).join('');
  simplifyCache.set(raw, output);
  return output;
}

function simplifyJson(value) {
  if (typeof value === 'string') return simplifyChineseText(value);
  if (Array.isArray(value)) return value.map(simplifyJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, simplifyJson(item)]));
  }
  return value;
}

function localizedValue(en, zh) {
  return {
    en: cleanText(en) || null,
    zh: simplifyChineseText(cleanText(zh)) || null,
  };
}

function normalizeCachedItem(cached, landmark) {
  cached = simplifyJson(cached);
  const nameEn = cleanText(cached.name?.en ?? landmark.wiki.en);
  const nameZh = cleanText(cached.name?.zh ?? landmark.wiki.zh);
  return {
    ...cached,
    id: landmark.id,
    category: landmark.kind ?? cached.category ?? null,
    coordinates: { lat: landmark.lat, lon: landmark.lon },
    location: cached.location ?? {
      country: { en: 'Italy', zh: '意大利' },
      region: { en: null, zh: null },
      province: { en: null, zh: null },
      city: { en: null, zh: null },
      administrativeArea: { en: null, zh: null },
      streetAddress: { en: null, zh: null },
      postalCode: null,
      ids: { country: 'Q38', province: null, city: null, administrativeArea: null },
    },
    visitorInfo: cached.visitorInfo ?? {
      openingHours: { en: null, zh: null },
      ticketPrice: { en: null, zh: null },
      reservationUrl: cached.wikidata?.officialWebsite ?? null,
      officialWebsite: cached.wikidata?.officialWebsite ?? null,
      phone: null,
      email: null,
      wheelchairAccessibility: null,
      annualVisitors: null,
      notices: { en: [], zh: [] },
      lastCheckedAt: new Date().toISOString(),
    },
    search: cached.search ?? {
      aliases: { en: [nameEn].filter(Boolean), zh: [nameZh].filter(Boolean) },
      tags: { en: [landmark.kind ?? cached.category].filter(Boolean), zh: [] },
    },
    routeHints: [],
  };
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

async function fetchRouteMetrics(landmarks) {
  const encoded = landmarks.map((item) => `${item.lon},${item.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=false&annotations=false&steps=false`;
  const json = await fetchJson(url);
  const route = json.routes?.[0];
  if (!route || route.legs?.length !== landmarks.length - 1) {
    throw new Error(`OSRM returned ${route?.legs?.length ?? 0} legs for ${landmarks.length} landmarks`);
  }
  return {
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationHours: Number((route.duration / 3600).toFixed(2)),
    legs: route.legs.map((leg, index) => ({
      fromId: landmarks[index].id,
      toId: landmarks[index + 1].id,
      distanceKm: Number((leg.distance / 1000).toFixed(1)),
      durationHours: Number((leg.duration / 3600).toFixed(2)),
      source: 'osrm',
    })),
    source: 'osrm',
  };
}

async function fetchRouteMatrix(landmarks) {
  const expected = landmarks.length;
  const blockSize = 20;
  const distancesKm = Array.from({ length: expected }, () => Array(expected).fill(null));
  const durationsHours = Array.from({ length: expected }, () => Array(expected).fill(null));

  for (let sourceStart = 0; sourceStart < expected; sourceStart += blockSize) {
    const sourceRows = landmarks.slice(sourceStart, sourceStart + blockSize);
    for (let destinationStart = 0; destinationStart < expected; destinationStart += blockSize) {
      const destinationRows = landmarks.slice(destinationStart, destinationStart + blockSize);
      const combined = [];
      const combinedIndex = new Map();
      for (const item of [...sourceRows, ...destinationRows]) {
        if (!combinedIndex.has(item.id)) {
          combinedIndex.set(item.id, combined.length);
          combined.push(item);
        }
      }
      const encoded = combined.map((item) => `${item.lon},${item.lat}`).join(';');
      const sources = sourceRows.map((item) => combinedIndex.get(item.id)).join(';');
      const destinations = destinationRows.map((item) => combinedIndex.get(item.id)).join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${encoded}?annotations=distance,duration&sources=${sources}&destinations=${destinations}`;
      const json = await fetchJson(url, { attempts: 5 });
      if (json.code !== 'Ok' || json.distances?.length !== sourceRows.length || json.durations?.length !== sourceRows.length) {
        throw new Error(`OSRM matrix block failed at ${sourceStart},${destinationStart}`);
      }
      json.distances.forEach((row, sourceOffset) => {
        row.forEach((value, destinationOffset) => {
          distancesKm[sourceStart + sourceOffset][destinationStart + destinationOffset] = Number.isFinite(value)
            ? Number((value / 1000).toFixed(1))
            : null;
        });
      });
      json.durations.forEach((row, sourceOffset) => {
        row.forEach((value, destinationOffset) => {
          durationsHours[sourceStart + sourceOffset][destinationStart + destinationOffset] = Number.isFinite(value)
            ? Number((value / 3600).toFixed(2))
            : null;
        });
      });
      console.log(`Routing block ${sourceStart + 1}-${sourceStart + sourceRows.length} x ${destinationStart + 1}-${destinationStart + destinationRows.length}`);
      await sleep(220);
    }
  }
  const hasMissingValue = distancesKm.some((row) => row.some((value) => value === null))
    || durationsHours.some((row) => row.some((value) => value === null));
  if (hasMissingValue) throw new Error('OSRM matrix contains an unreachable landmark pair');
  return {
    ids: landmarks.map((item) => item.id),
    distancesKm,
    durationsHours,
    source: 'osrm',
  };
}

function routeFromMatrix(landmarks, matrix) {
  const legs = landmarks.slice(1).map((item, index) => ({
    fromId: landmarks[index].id,
    toId: item.id,
    distanceKm: matrix.distancesKm[index][index + 1],
    durationHours: matrix.durationsHours[index][index + 1],
    source: 'osrm',
  }));
  return {
    distanceKm: Number(legs.reduce((sum, leg) => sum + leg.distanceKm, 0).toFixed(1)),
    durationHours: Number(legs.reduce((sum, leg) => sum + leg.durationHours, 0).toFixed(2)),
    legs,
    source: 'osrm',
  };
}

function visitMetadataFor(landmark) {
  const kindById = {
    milan_duomo: 'cathedral',
    venice_rialto: 'bridge',
    florence_duomo: 'cathedral',
    pisa: 'tower',
    colosseum: 'arena',
    pompeii: 'ruins',
    pantheon_rome: 'dome',
    trevi_fountain: 'fountain',
    roman_forum: 'ruins',
    uffizi_gallery: 'museum',
    siena_cathedral: 'cathedral',
    verona_arena: 'arena',
    st_marks_basilica: 'cathedral',
    doges_palace: 'palace',
    cinque_terre: 'coast',
    lake_como: 'lake',
    mole_antonelliana: 'tower',
    san_vitale_ravenna: 'cathedral',
    assisi_basilica: 'cathedral',
    caserta_palace: 'palace',
    herculaneum: 'ruins',
    paestum: 'temple',
    matera_sassi: 'village',
    alberobello_trulli: 'village',
    castel_del_monte: 'castle',
    amalfi_coast: 'coast',
    valley_of_temples: 'temple',
    mount_etna: 'mountain',
    palermo_cathedral: 'cathedral',
    nuraghe_su_nuraxi: 'ruins',
  };
  const kind = landmark.kind ?? kindById[landmark.id] ?? 'landmark';
  const durationByKind = {
    arena: 2,
    bridge: 1,
    castle: 2,
    cathedral: 2,
    coast: 4,
    dome: 1.5,
    fountain: 0.75,
    lake: 4,
    mountain: 4,
    museum: 3,
    palace: 2.5,
    ruins: 2.5,
    temple: 2,
    tower: 1.5,
    village: 3,
  };
  return {
    durationHours: durationByKind[kind] ?? 2,
    bestTime: { en: null, zh: null },
    audiences: { en: [], zh: [] },
    bookingNote: { en: null, zh: null },
    fit: { en: null, zh: null },
    firstTimer: null,
    planningEstimate: true,
    sourceNote: {
      en: 'This is an editorial planning allowance, not an official visit duration.',
      zh: '这是行程编排用的建议预留时间，不是景点官方公布的游览时长。',
    },
  };
}

function validatePayload(payload, expected) {
  if (payload.items.length !== expected) throw new Error(`Expected ${expected} landmarks, received ${payload.items.length}`);
  if (new Set(payload.items.map((item) => item.id)).size !== expected) throw new Error('Landmark ids are not unique');
  if (new Set(payload.items.map((item) => item.wikidataId)).size !== expected) throw new Error('Wikidata ids are not unique');

  payload.items.forEach((item) => {
    if (!FAST_CATALOG_ONLY && (!item.wikipedia.en?.extract || !item.wikipedia.zh?.extract)) throw new Error(`Missing bilingual Wikipedia summary for ${item.id}`);
    if (!item.name.en || !item.name.zh) throw new Error(`Missing bilingual name for ${item.id}`);
    if (![item.coordinates.lat, item.coordinates.lon].every(Number.isFinite)) throw new Error(`Missing coordinates for ${item.id}`);
    if (!item.wikidata.source) throw new Error(`Missing Wikidata source for ${item.id}`);
    if (!item.location?.country?.en || !item.location?.country?.zh) throw new Error(`Missing bilingual country for ${item.id}`);
    if (!item.search?.aliases?.en?.length || !item.search?.aliases?.zh?.length) throw new Error(`Missing bilingual search aliases for ${item.id}`);
    const chinesePayload = JSON.stringify({
      name: item.name.zh,
      summary: item.wikipedia.zh.extract,
      location: {
        country: item.location.country.zh,
        region: item.location.region.zh,
        province: item.location.province.zh,
        city: item.location.city.zh,
        administrativeArea: item.location.administrativeArea.zh,
      },
      visitorInfo: {
        openingHours: item.visitorInfo.openingHours.zh,
        ticketPrice: item.visitorInfo.ticketPrice.zh,
        notices: item.visitorInfo.notices.zh,
      },
      search: item.search.aliases.zh,
    });
    if (TRADITIONAL_CHINESE_PATTERN.test(chinesePayload)) {
      throw new Error(`Traditional Chinese residue detected for ${item.id}`);
    }
  });

  const matrixSize = Math.min(ROUTING_MATRIX_LIMIT, expected);
  if (matrixSize > 1) {
    if (payload.route.legs.length !== matrixSize - 1) throw new Error('Default route has an incomplete OSRM leg list');
    if (payload.routeMatrix.ids.length !== matrixSize) throw new Error('OSRM matrix id list is incomplete');
    if (payload.routeMatrix.distancesKm.length !== matrixSize || payload.routeMatrix.durationsHours.length !== matrixSize) {
      throw new Error('OSRM matrix row count is incomplete');
    }
    if (payload.routeMatrix.distancesKm.some((row) => row.length !== matrixSize || row.some((value) => !Number.isFinite(value)))) {
      throw new Error('OSRM distance matrix contains an invalid value');
    }
    if (payload.routeMatrix.durationsHours.some((row) => row.length !== matrixSize || row.some((value) => !Number.isFinite(value)))) {
      throw new Error('OSRM duration matrix contains an invalid value');
    }
  }
}

async function main() {
  console.log(`[start] target=${TARGET_LANDMARK_COUNT} routingMatrixLimit=${ROUTING_MATRIX_LIMIT} out=${OUT_FILE}`);
  const discoveredCatalog = await buildLandmarkCatalog();
  if (process.env.DISCOVERY_ONLY === '1') {
    console.log(`Discovery-only result: ${discoveredCatalog.length} usable candidates for target ${TARGET_LANDMARK_COUNT}.`);
    return;
  }
  const existingItems = await loadExistingItems();
  if (FAST_CATALOG_ONLY) {
    const uniqueFastCatalog = [...new Map(discoveredCatalog
      .filter((landmark) => landmark.wikidataId)
      .map((landmark) => [landmark.wikidataId, landmark])).values()]
      .slice(0, TARGET_LANDMARK_COUNT);
    const items = uniqueFastCatalog.map((landmark) => {
      const cached = existingItems.get(landmark.wikidataId);
      if (cached) return normalizeCachedItem(cached, landmark);
      return {
        id: landmark.id,
        wikidataId: landmark.wikidataId,
        category: landmark.kind ?? 'landmark',
        name: {
          en: cleanText(landmark.wiki.en),
          zh: simplifyChineseText(cleanText(landmark.wiki.zh)),
        },
        coordinates: { lat: landmark.lat, lon: landmark.lon },
        location: {
          country: { en: 'Italy', zh: '意大利' },
          region: { en: null, zh: null },
          province: { en: null, zh: null },
          city: { en: null, zh: null },
          administrativeArea: { en: null, zh: null },
          streetAddress: { en: null, zh: null },
          postalCode: null,
          ids: { country: 'Q38', province: null, city: null, administrativeArea: null },
        },
        wikidata: {
          label: null,
          description: null,
          image: null,
          heritageId: null,
          officialWebsite: null,
          openDays: null,
          ticketFee: null,
          inception: null,
          instanceIds: [],
          instanceLabels: [],
          source: `https://www.wikidata.org/wiki/${landmark.wikidataId}`,
        },
        wikipedia: {
          en: {
            title: cleanText(landmark.wiki.en),
            extract: null,
            pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(landmark.wiki.en.replaceAll(' ', '_'))}`,
            thumbnail: null,
            wikibaseItem: landmark.wikidataId,
            source: 'wikipedia',
          },
          zh: {
            title: simplifyChineseText(cleanText(landmark.wiki.zh)),
            extract: null,
            pageUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(landmark.wiki.zh.replaceAll(' ', '_'))}`,
            thumbnail: null,
            wikibaseItem: landmark.wikidataId,
            source: 'wikipedia',
            variant: 'zh-cn',
          },
        },
        visitorInfo: {
          openingHours: { en: null, zh: null },
          ticketPrice: { en: null, zh: null },
          reservationUrl: null,
          officialWebsite: null,
          phone: null,
          email: null,
          wheelchairAccessibility: null,
          annualVisitors: null,
          notices: { en: [], zh: [] },
          lastCheckedAt: null,
        },
        weather: {
          temperatureC: null,
          weatherCode: null,
          windKph: null,
          observedAt: null,
          source: null,
        },
        visit: visitMetadataFor(landmark),
        search: {
          aliases: {
            en: [cleanText(landmark.wiki.en)].filter(Boolean),
            zh: [simplifyChineseText(cleanText(landmark.wiki.zh))].filter(Boolean),
          },
          tags: {
            en: [landmark.kind ?? 'landmark', 'Italy'],
            zh: [landmark.kind ?? 'landmark', '意大利'],
          },
        },
        routeHints: [],
        sources: {
          wikipedia: {
            en: `https://en.wikipedia.org/wiki/${encodeURIComponent(landmark.wiki.en.replaceAll(' ', '_'))}`,
            zh: `https://zh.wikipedia.org/wiki/${encodeURIComponent(landmark.wiki.zh.replaceAll(' ', '_'))}`,
            fetchedAt: new Date().toISOString(),
          },
          wikidata: `https://www.wikidata.org/wiki/${landmark.wikidataId}`,
          officialWebsite: null,
          weather: null,
          routing: null,
        },
      };
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      sources: {
        wikidata: 'https://query.wikidata.org/sparql',
        wikipedia: 'https://www.mediawiki.org/wiki/API_REST_API',
        weather: null,
        routing: null,
      },
      catalog: {
        targetCount: TARGET_LANDMARK_COUNT,
        routingMatrixCount: 0,
        languagePolicy: 'Fast catalog mode: sourced bilingual titles and coordinates; missing fields remain null.',
        nullPolicy: 'Unknown structured visitor information is stored as null or an empty list.',
      },
      items,
      route: { distanceKm: 0, durationHours: 0, legs: [], source: 'not-precomputed' },
      routeMatrix: { ids: [], distancesKm: [], durationsHours: [], source: 'not-precomputed' },
    };
    validatePayload(payload, items.length);
    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`[fast] wrote ${items.length} catalog landmarks to ${OUT_FILE}`);
    return;
  }
  const checkpoint = await loadCheckpoint();
  const landmarkCatalog = checkpoint?.resolved?.map((item) => item.landmark) ?? [];
  const resolvedWikidataIds = new Set((checkpoint?.resolved ?? []).map((item) => item.wikidataId).filter(Boolean));
  const skippedIds = new Set(checkpoint?.skippedIds ?? []);
  let discoveryCursor = 0;
  let skippedCount = skippedIds.size;
  const startedAt = Date.now();
  const printProgress = (stage) => {
    const ok = landmarkCatalog.length;
    const attempted = ok + skippedCount;
    const percent = ((ok / TARGET_LANDMARK_COUNT) * 100).toFixed(1);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const rate = ok / elapsedSeconds;
    const etaSeconds = rate > 0 ? Math.round((TARGET_LANDMARK_COUNT - ok) / rate) : null;
    const eta = etaSeconds == null
      ? '--'
      : `${Math.floor(etaSeconds / 60)}m${String(etaSeconds % 60).padStart(2, '0')}s`;
    console.log(`[${stage}] ${ok}/${TARGET_LANDMARK_COUNT} ${percent}% | attempted=${attempted} skipped=${skippedCount} elapsed=${elapsedSeconds}s eta=${eta}`);
  };
  console.log(`Discovered ${discoveredCatalog.length} verified Italian landmarks.`);
  const resolved = (checkpoint?.resolved ?? []).map((item) => ({
    ...item,
    cached: item.cached ? existingItems.get(item.wikidataId) : null,
  }));
  if (resolved.length) console.log(`[resume] loaded ${resolved.length} resolved landmarks from ${CHECKPOINT_FILE}`);
  while (landmarkCatalog.length < TARGET_LANDMARK_COUNT) {
    const landmark = discoveredCatalog[discoveryCursor++];
    if (!landmark) {
      throw new Error(`Could not fill ${TARGET_LANDMARK_COUNT} unique Wikidata landmarks`);
    }
    if ((landmark.wikidataId && resolvedWikidataIds.has(landmark.wikidataId)) || skippedIds.has(landmark.id)) continue;
    printProgress(`resolve ${landmark.id}`);
    try {
      const summaryEn = await fetchWikipediaSummary(landmark.wiki.en, 'en');
      if (!summaryEn.wikibaseItem && !landmark.wikidataId) {
        console.log(`Skipping ${landmark.id}: no Wikidata id resolved`);
        skippedCount += 1;
        skippedIds.add(landmark.id);
        await saveCheckpoint(resolved, skippedIds);
        continue;
      }
      if (landmark.wikidataId && summaryEn.wikibaseItem && landmark.wikidataId !== summaryEn.wikibaseItem) {
        console.log(`Skipping ${landmark.id}: Wikidata mismatch ${landmark.wikidataId} vs ${summaryEn.wikibaseItem}`);
        skippedCount += 1;
        skippedIds.add(landmark.id);
        await saveCheckpoint(resolved, skippedIds);
        continue;
      }
      const wikidataId = summaryEn.wikibaseItem ?? landmark.wikidataId;
      if (resolvedWikidataIds.has(wikidataId)) {
        console.log(`Skipping duplicate Wikidata entity ${wikidataId}: ${landmark.id}`);
        skippedCount += 1;
        skippedIds.add(landmark.id);
        await saveCheckpoint(resolved, skippedIds);
        continue;
      }
      const cached = existingItems.get(wikidataId);
      const summaryZh = cached?.wikipedia?.zh?.extract
        ? simplifyJson(cached.wikipedia.zh)
        : await fetchWikipediaSummary(landmark.wiki.zh, 'zh');
      if (!summaryZh?.extract) {
        console.log(`Skipping ${landmark.id}: missing sourced Simplified Chinese summary`);
        skippedCount += 1;
        skippedIds.add(landmark.id);
        await saveCheckpoint(resolved, skippedIds);
        continue;
      }
      const weather = cached?.weather ?? {
        temperatureC: null,
        weatherCode: null,
        windKph: null,
        observedAt: null,
        source: null,
      };
      resolvedWikidataIds.add(wikidataId);
      landmarkCatalog.push(landmark);
      resolved.push({
        landmark,
        summaryEn: cached?.wikipedia?.en ?? summaryEn,
        summaryZh,
        weather,
        wikidataId,
        cached,
      });
      await saveCheckpoint(resolved, skippedIds);
      await sleep(80);
    } catch (error) {
      console.log(`Skipping ${landmark.id}: ${error.message}`);
      skippedCount += 1;
      skippedIds.add(landmark.id);
      await saveCheckpoint(resolved, skippedIds);
      continue;
    }
  }
  printProgress('resolve complete');

  const metadataIds = [...new Set(resolved
    .filter((item) => !item.cached)
    .map((item) => item.wikidataId)
    .filter(Boolean))];
  const wikidataRows = await fetchOptionalWikidataRows(metadataIds);
  const wikidataById = new Map(wikidataRows.map((row) => [row.wikidataId, row]));
  if (wikidataById.size !== metadataIds.length) console.log(`[details] filled ${wikidataById.size}/${metadataIds.length}; missing detail fields will stay empty.`);

  const items = [];
  let assembledCount = 0;
  const assembleStartedAt = Date.now();
  const printAssembleProgress = () => {
    const elapsed = Math.max(1, Math.round((Date.now() - assembleStartedAt) / 1000));
    const percent = ((assembledCount / resolved.length) * 100).toFixed(1);
    console.log(`[assemble] ${assembledCount}/${resolved.length} ${percent}% elapsed=${elapsed}s`);
  };
  for (const { landmark, summaryEn, summaryZh, weather, wikidataId, cached } of resolved) {
    const wikidata = wikidataById.get(wikidataId);
    if (cached && !wikidata) {
      items.push(normalizeCachedItem(cached, landmark));
      assembledCount += 1;
      if (assembledCount === 1 || assembledCount % 50 === 0 || assembledCount === resolved.length) printAssembleProgress();
      continue;
    }
    const detail = wikidata ?? {
      wikidataId,
      label: null,
      description: null,
      coord: null,
      image: null,
      heritageId: null,
      officialWebsite: null,
      openDays: null,
      ticketFee: null,
      inception: null,
      streetAddress: null,
      phone: null,
      email: null,
      postalCode: null,
      wheelchair: null,
      visitorCount: null,
      adminId: null,
      adminLabelEn: null,
      adminLabelZh: null,
      provinceId: null,
      provinceLabelEn: null,
      provinceLabelZh: null,
      countryId: 'Q38',
      countryLabelEn: 'Italy',
      countryLabelZh: '意大利',
      locationId: null,
      locationLabelEn: null,
      locationLabelZh: null,
      instanceIds: [],
      instanceLabels: [],
      enWikiTitle: landmark.wiki.en,
      zhWikiTitle: landmark.wiki.zh,
    };
    const wikidataCoord = parsePoint(detail.coord);
    const coords = wikidataCoord ?? { lat: landmark.lat, lon: landmark.lon };
    if (![coords.lat, coords.lon].every(Number.isFinite)) {
      throw new Error(`Invalid coordinates for ${landmark.id}`);
    }
    const nameZh = simplifyChineseText(cleanText(summaryZh.title ?? landmark.wiki.zh));
    const wikipediaZhTitle = simplifyChineseText(cleanText(summaryZh.title));
    const wikipediaZhExtract = simplifyChineseText(cleanText(summaryZh.extract));

    items.push({
      id: landmark.id,
      wikidataId,
      category: landmark.kind ?? null,
      name: {
        en: cleanText(summaryEn.title),
        zh: nameZh,
      },
      coordinates: coords,
      location: {
        country: localizedValue(detail.countryLabelEn ?? 'Italy', detail.countryLabelZh ?? '意大利'),
        region: localizedValue(detail.provinceLabelEn, detail.provinceLabelZh),
        province: localizedValue(detail.provinceLabelEn, detail.provinceLabelZh),
        city: localizedValue(
          detail.locationLabelEn ?? detail.adminLabelEn,
          detail.locationLabelZh ?? detail.adminLabelZh,
        ),
        administrativeArea: localizedValue(detail.adminLabelEn, detail.adminLabelZh),
        streetAddress: localizedValue(detail.streetAddress, detail.streetAddress),
        postalCode: cleanText(detail.postalCode) || null,
        ids: {
          country: detail.countryId,
          province: detail.provinceId,
          city: detail.locationId ?? detail.adminId,
          administrativeArea: detail.adminId,
        },
      },
      wikidata: {
        label: cleanText(detail.label) || null,
        description: cleanText(detail.description) || null,
        image: detail.image ?? summaryEn.thumbnail ?? summaryZh.thumbnail ?? null,
        heritageId: detail.heritageId ?? null,
        officialWebsite: detail.officialWebsite ?? null,
        openDays: detail.openDays ?? null,
        ticketFee: detail.ticketFee ?? null,
        inception: detail.inception ?? null,
        instanceIds: detail.instanceIds ?? [],
        instanceLabels: detail.instanceLabels ?? [],
        source: wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : null,
      },
      wikipedia: {
        en: { ...summaryEn, title: cleanText(summaryEn.title), extract: cleanText(summaryEn.extract) },
        zh: { ...summaryZh, title: wikipediaZhTitle, extract: wikipediaZhExtract },
      },
      visitorInfo: {
        openingHours: localizedValue(detail.openDays, detail.openDays),
        ticketPrice: localizedValue(detail.ticketFee, detail.ticketFee),
        reservationUrl: detail.officialWebsite ?? null,
        officialWebsite: detail.officialWebsite ?? null,
        phone: cleanText(detail.phone) || null,
        email: cleanText(detail.email) || null,
        wheelchairAccessibility: cleanText(detail.wheelchair) || null,
        annualVisitors: Number.isFinite(Number(detail.visitorCount)) ? Number(detail.visitorCount) : null,
        notices: { en: [], zh: [] },
        lastCheckedAt: new Date().toISOString(),
      },
      weather,
      visit: visitMetadataFor(landmark),
      search: {
        aliases: {
          en: [...new Set([summaryEn.title, detail.enWikiTitle, ...(detail.instanceLabels ?? [])].map(cleanText).filter(Boolean))],
          zh: [...new Set([summaryZh.title, detail.zhWikiTitle, detail.label].map((value) => simplifyChineseText(cleanText(value))).filter(Boolean))],
        },
        tags: {
          en: [...new Set([
            landmark.kind,
            detail.adminLabelEn,
            detail.provinceLabelEn,
            detail.countryLabelEn ?? 'Italy',
            ...(detail.instanceLabels ?? []),
          ].map(cleanText).filter(Boolean))],
          zh: [...new Set([
            landmark.kind,
            detail.adminLabelZh,
            detail.provinceLabelZh,
            detail.countryLabelZh ?? '意大利',
          ].map((value) => simplifyChineseText(cleanText(value))).filter(Boolean))],
        },
      },
      routeHints: [],
      sources: {
        wikipedia: {
          en: summaryEn.pageUrl,
          zh: summaryZh?.pageUrl ?? null,
          fetchedAt: new Date().toISOString(),
        },
        image: summaryEn.thumbnail ?? summaryZh.thumbnail ?? detail.image ?? null,
        wikidata: wikidataId ? `https://www.wikidata.org/wiki/${wikidataId}` : null,
        officialWebsite: detail.officialWebsite ?? null,
        weather: 'https://open-meteo.com/en/docs',
        routing: 'https://project-osrm.org/',
      },
    });
    assembledCount += 1;
    if (assembledCount === 1 || assembledCount % 50 === 0 || assembledCount === resolved.length) printAssembleProgress();
  }

  console.log('[route] building route metadata');
  const routeLandmarks = items.slice(0, Math.min(ROUTING_MATRIX_LIMIT, items.length)).map((item) => ({
    id: item.id,
    lat: item.coordinates.lat,
    lon: item.coordinates.lon,
  }));
  const routeMatrix = routeLandmarks.length > 1
    ? await fetchRouteMatrix(routeLandmarks)
    : { ids: [], distancesKm: [], durationsHours: [], source: 'not-precomputed' };
  const route = routeLandmarks.length > 1
    ? routeFromMatrix(routeLandmarks, routeMatrix)
    : { distanceKm: 0, durationHours: 0, legs: [], source: 'not-precomputed' };
  items.forEach((item, index) => {
    const leg = route.legs[index];
    item.routeHints = leg ? [{
      nextStopId: leg.toId,
      distanceKm: leg.distanceKm,
      durationHours: leg.durationHours,
      source: leg.source,
    }] : [];
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      wikidata: 'https://query.wikidata.org/sparql',
      wikipedia: 'https://www.mediawiki.org/wiki/API_REST_API',
      weather: 'https://open-meteo.com/en/docs',
      routing: 'https://project-osrm.org/',
    },
    catalog: {
      targetCount: TARGET_LANDMARK_COUNT,
      routingMatrixCount: routeMatrix.ids.length,
      languagePolicy: 'English plus Simplified Chinese (zh-cn); missing source fields remain null.',
      nullPolicy: 'Unknown structured visitor information is stored as null or an empty list.',
    },
    items,
    route,
    routeMatrix,
  };

  console.log('[validate] validating payload');
  validatePayload(payload, landmarkCatalog.length);
  console.log(`[write] writing ${items.length} landmarks to ${OUT_FILE}`);
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${items.length} landmarks to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Route: ${route.distanceKm} km, ${route.durationHours} h`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
